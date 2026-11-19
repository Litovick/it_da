import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon, IconName } from "./components/Icons";
import { SettingsModal, TripRecord } from "./components/SettingsModal";
import { HelpModal } from "./components/HelpModal";
import {
  CHUNCHEON_ROUTES,
  ChuncheonRoute,
  matchChuncheonDestination,
} from "./data/chuncheonRoutes";

type ExperienceMode = "setup" | "confirm" | "journey";
type BusMotionState = "moving" | "stopped";
type RecoveryStage =
  | "none"
  | "missed-waiting-stop"
  | "cross-to-opposite"
  | "wait-return-bus";

type SpeechRecognitionResultLike = {
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<SpeechRecognitionResultLike>;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const STORAGE_KEYS = {
  voiceEnabled: "itda_voice_enabled",
  voiceSpeed: "itda_voice_speed",
  vibrationEnabled: "itda_vibration_enabled",
  guardianSharing: "itda_guardian_sharing",
  favoriteIds: "itda_favorite_ids",
  tripHistory: "itda_trip_history",
};

function loadStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : raw === "true";
  } catch {
    return fallback;
  }
}

function loadStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const previewScreen = new URLSearchParams(window.location.search).get("screen");
const previewStep: Record<string, number> = {
  exit: 0,
  walk: 1,
  wait: 2,
  ride: 3,
  alight: 3,
  destination: 4,
  arrived: 5,
};
const initialExperienceMode: ExperienceMode =
  previewScreen === "home" || !previewScreen
    ? "setup"
    : previewScreen === "confirm"
      ? "confirm"
      : "journey";
const initialStepIndex = previewScreen ? (previewStep[previewScreen] ?? 0) : 0;
const initialRemainingStops = previewScreen === "alight" ? 1 : 4;

const DEFAULT_TRIPS: TripRecord[] = [
  {
    id: "default-1",
    origin: "춘천역 1번 출구",
    destination: "춘천시청",
    busNumber: "5",
    timestamp: "어제",
  },
];

function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function App() {
  const [nowTime, setNowTime] = useState(() => formatClock(new Date()));
  const [experienceMode, setExperienceMode] = useState<ExperienceMode>(initialExperienceMode);
  const [activeRoute, setActiveRoute] = useState<ChuncheonRoute>(CHUNCHEON_ROUTES[0]);
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const [transcript, setTranscript] = useState("");
  const [assistantMessage, setAssistantMessage] = useState(
    "가고 싶은 곳을 평소 말투로 말씀해 주세요.",
  );

  // Transit progression & safety state
  const [waitMinutes, setWaitMinutes] = useState(CHUNCHEON_ROUTES[0].initialWaitMinutes);
  const [busStopsAway, setBusStopsAway] = useState(CHUNCHEON_ROUTES[0].initialBusStopsAway);
  const [remainingStops, setRemainingStops] = useState(initialRemainingStops);
  const [busMotionState, setBusMotionState] = useState<BusMotionState>("moving");
  const [deviationCheckOpen, setDeviationCheckOpen] = useState(false);
  const [safeRecoveryMode, setSafeRecoveryMode] = useState(false);
  const [recoveryStage, setRecoveryStage] = useState<RecoveryStage>("none");

  // Preferences & History
  const [voiceEnabled, setVoiceEnabled] = useState(() =>
    loadStoredBoolean(STORAGE_KEYS.voiceEnabled, true),
  );
  const [voiceSpeed, setVoiceSpeed] = useState<"slow" | "normal">(() =>
    loadStoredJson<"slow" | "normal">(STORAGE_KEYS.voiceSpeed, "slow"),
  );
  const [vibrationEnabled, setVibrationEnabled] = useState(() =>
    loadStoredBoolean(STORAGE_KEYS.vibrationEnabled, true),
  );
  const [guardianSharing, setGuardianSharing] = useState(() =>
    loadStoredBoolean(STORAGE_KEYS.guardianSharing, true),
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadStoredJson<string[]>(STORAGE_KEYS.favoriteIds, [
      "cityhall",
      "hallym-hospital",
      "welfare",
      "market",
    ]),
  );
  const [tripHistory, setTripHistory] = useState<TripRecord[]>(() =>
    loadStoredJson<TripRecord[]>(STORAGE_KEYS.tripHistory, DEFAULT_TRIPS),
  );

  // Modals, Voice input & Haptic visual cue
  const [showGuardianPanel, setShowGuardianPanel] = useState(previewScreen === "settings");
  const [showHelpPanel, setShowHelpPanel] = useState(previewScreen === "help");
  const [typedDestination, setTypedDestination] = useState("");
  const [ambiguousMatches, setAmbiguousMatches] = useState<ChuncheonRoute[]>([]);
  const [isDestinationListening, setIsDestinationListening] = useState(false);
  const [isJourneyListening, setIsJourneyListening] = useState(false);
  const [vibrationToast, setVibrationToast] = useState<string | null>(null);

  const rideTimerRef = useRef<number | null>(null);
  const waitTimerRef = useRef<number | null>(null);
  const stopDelayRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const destinationInputRef = useRef<HTMLInputElement | null>(null);
  const appShellRef = useRef<HTMLElement | null>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const activeStep = activeRoute.steps[stepIndex];
  const progress =
    experienceMode === "journey"
      ? ((stepIndex + 1) / activeRoute.steps.length) * 100
      : 0;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowTime(formatClock(new Date()));
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.voiceEnabled, String(voiceEnabled));
      window.localStorage.setItem(STORAGE_KEYS.voiceSpeed, JSON.stringify(voiceSpeed));
      window.localStorage.setItem(STORAGE_KEYS.vibrationEnabled, String(vibrationEnabled));
      window.localStorage.setItem(STORAGE_KEYS.guardianSharing, String(guardianSharing));
      window.localStorage.setItem(STORAGE_KEYS.favoriteIds, JSON.stringify(favoriteIds));
      window.localStorage.setItem(STORAGE_KEYS.tripHistory, JSON.stringify(tripHistory));
    } catch {
      // Ignore storage quota errors
    }
  }, [voiceEnabled, voiceSpeed, vibrationEnabled, guardianSharing, favoriteIds, tripHistory]);

  const speakMessage = useCallback(
    (text: string) => {
      if (!voiceEnabled) return;
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ko-KR";
      utterance.rate = voiceSpeed === "slow" ? 0.75 : 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    },
    [voiceEnabled, voiceSpeed],
  );

  const triggerHaptic = useCallback(
    (pattern: number[], toastLabel: string) => {
      if (!vibrationEnabled) return;
      navigator.vibrate?.(pattern);
      setVibrationToast(toastLabel);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = window.setTimeout(() => {
        setVibrationToast(null);
      }, 3600);
    },
    [vibrationEnabled],
  );

  // Build step copy respecting Principle 2 (Hierarchy) and Principle 4 (No alighting while moving)
  const waitStepOverride = useMemo(() => {
    if (stepIndex !== 2) return null;
    if (waitMinutes === 0) {
      return {
        heroMetric: "곧 도착",
        title: `${activeRoute.busNumber}번 버스가 정차해요`,
        detail: "버스가 완전히 멈추고 앞문이 열린 뒤 천천히 타세요.",
        prompt: "버스에 타셨으면 “탔어”라고 말씀해 주세요.",
      };
    }
    return {
      heroMetric: `${waitMinutes}분 후 도착`,
      title: `${activeRoute.busNumber}번 버스를 타세요`,
      detail: "의자에 앉아 기다리다 버스가 멈춘 뒤 탑승하세요.",
      prompt: "버스에 타시면 “탔어”라고 말씀해 주세요.",
    };
  }, [activeRoute.busNumber, stepIndex, waitMinutes]);

  const rideStepOverride = useMemo(() => {
    if (stepIndex !== 3) return null;

    if (recoveryStage === "missed-waiting-stop") {
      if (busMotionState === "moving") {
        return {
          icon: "alert" as IconName,
          heroMetric: "다음 정류장 하차",
          title: "앉아서 멈출 때까지 기다리세요",
          detail:
            "하차를 못 하셨나요? 괜찮습니다. 버스가 움직이는 동안에는 일어나지 마시고 다음 정류장에 멈춘 뒤 내리세요.",
          prompt: "정차할 때까지 손잡이를 잡고 앉아 계세요.",
          quickReplies: ["다시 말해줘", "목적지 바꾸기"],
        };
      }
      return {
        icon: "bell" as IconName,
        heroMetric: "정차 완료 · 하차 가능",
        title: "안전하게 멈췄어요, 내리세요",
        detail: "다음 정류장에 안전하게 멈췄습니다. 천천히 내리시면 돌아가는 길을 다시 안내해 드릴게요.",
        prompt: "내리신 뒤 위 버튼을 눌러 주세요.",
        quickReplies: ["다시 말해줘", "목적지 바꾸기"],
      };
    }

    if (recoveryStage === "cross-to-opposite") {
      return {
        icon: "walk" as IconName,
        heroMetric: "반대편 정류장 이동",
        title: "반대편 정류장으로 건너가세요",
        detail: "가까운 횡단보도 초록불을 확인하고 천천히 길 건너 정류장으로 이동하세요.",
        prompt: "반대편 정류장에 도착하면 알려 주세요.",
        quickReplies: ["다시 말해줘", "목적지 바꾸기"],
      };
    }

    if (recoveryStage === "wait-return-bus") {
      return {
        icon: "bus" as IconName,
        heroMetric: `${activeRoute.busNumber}번 복귀 버스`,
        title: `반대 방향 ${activeRoute.busNumber}번 버스를 타세요`,
        detail: `이 버스를 타시면 1정거장 뒤 ${activeRoute.destinationStopName}에 내리실 수 있어요.`,
        prompt: "복귀 버스에 타시면 위 버튼을 눌러 주세요.",
        quickReplies: ["다시 말해줘", "목적지 바꾸기"],
      };
    }

    if (safeRecoveryMode) {
      if (busMotionState === "moving") {
        return {
          icon: "alert" as IconName,
          heroMetric: "다음 정류장 하차",
          title: "앉아서 멈출 때까지 기다리세요",
          detail:
            "지금 버스가 달리고 있어요. 절대 일어나지 마시고 다음 정류장에 완전히 멈춘 뒤 내리세요.",
          prompt: "정차한 뒤에 기사님께 방향을 여쭤보거나 천천히 내리세요.",
          quickReplies: ["다시 말해줘", "목적지 바꾸기"],
        };
      }
      return {
        icon: "bell" as IconName,
        heroMetric: "정차 완료 · 하차 가능",
        title: "안전하게 멈췄어요, 내리세요",
        detail: `기사님께 ${activeRoute.name} 방면인지 확인하시거나 천천히 내린 뒤 다시 안내해 드릴게요.`,
        prompt: "내리셨으면 “내렸어”라고 말씀해 주세요.",
        quickReplies: ["내렸어", "다시 말해줘", "목적지 바꾸기"],
      };
    }

    if (busMotionState === "stopped" && remainingStops === 0) {
      return {
        icon: "bell" as IconName,
        heroMetric: "정차 완료 · 지금 하차",
        title: "안전하게 멈췄어요, 내리세요",
        detail: `${activeRoute.destinationStopName}입니다. 발밑을 보며 천천히 내리세요.`,
        prompt: "내리신 뒤 “내렸어”라고 말씀해 주세요.",
      };
    }

    if (busMotionState === "moving" && remainingStops === 0) {
      return {
        icon: "bell" as IconName,
        heroMetric: "곧 정차 · 착석 유지",
        title: "멈춘 뒤에 일어나세요",
        detail: `${activeRoute.destinationStopName}에 다 왔어요. 버스가 완전히 정차할 때까지 앉아 계세요.`,
        prompt: "주행 중에는 자리에서 일어나지 마세요.",
      };
    }

    if (remainingStops === 1) {
      return {
        phase: "하차 준비",
        icon: "bell" as IconName,
        heroMetric: "1정거장 남음",
        title: "내릴 준비를 하세요",
        detail: `다음은 ${activeRoute.destinationStopName}입니다. 소지품을 챙기시고 버스가 완전히 멈춘 뒤 일어나세요.`,
        prompt: "움직이는 동안에는 손잡이를 잡고 앉아 계세요.",
      };
    }

    if (remainingStops === 2) {
      return {
        icon: "bell" as IconName,
        heroMetric: "2정거장 남음",
        title: "내릴 준비만 해주세요",
        detail: "아직 두 정거장 남았어요. 자리에 편히 앉아 계시면 됩니다.",
        prompt: "정차할 때 진동과 소리로 다시 알려드릴게요.",
      };
    }

    return {
      icon: activeStep.icon,
      heroMetric: `${remainingStops}정거장 남음`,
      title: "자리에 앉아 편히 가세요",
      detail: "내릴 때가 가까워지면 진동과 소리로 먼저 알려드릴게요.",
      prompt: "휴대폰은 주머니에 넣어 두셔도 됩니다.",
    };
  }, [
    activeRoute.busNumber,
    activeRoute.destinationStopName,
    activeRoute.name,
    activeStep.icon,
    busMotionState,
    recoveryStage,
    remainingStops,
    safeRecoveryMode,
    stepIndex,
  ]);

  const journeyStep = useMemo(
    () => ({
      ...activeStep,
      ...(waitStepOverride ?? {}),
      ...(rideStepOverride ?? {}),
    }),
    [activeStep, rideStepOverride, waitStepOverride],
  );

  const visibleStep =
    experienceMode === "setup"
      ? {
          phase: "이동 준비",
          icon: "mic" as IconName,
          place: "춘천역 출발",
          heroMetric: undefined,
          title: "어디로 가실 건가요?",
          detail: "말씀하시거나 목적지를 직접 입력해 주세요.",
          prompt: "말하기 어려운 상황에는 아래 검색창을 이용하셔도 됩니다.",
          quickReplies: ["춘천시청 가려고", "병원 가려고", "후평동 복지관"],
        }
      : experienceMode === "confirm"
        ? {
            phase: "목적지 확인",
            icon: "check" as IconName,
            place: `${activeRoute.origin} 출발`,
            heroMetric: `${activeRoute.busNumber}번 버스 · 약 ${activeRoute.totalMinutes}분`,
            title: `${activeRoute.name}으로 안내할까요?`,
            detail: `${activeRoute.origin} ${activeRoute.exitLabel}에서 출발해 ${activeRoute.busNumber}번 버스로 이동하는 길입니다.`,
            prompt: "맞으면 “응, 맞아”, 다르면 “목적지 바꾸기”를 눌러 주세요.",
            quickReplies: ["응, 맞아", "목적지 바꾸기", "다시 말해줘"],
          }
        : journeyStep;

  const startRouteConfirmation = useCallback(
    (route: ChuncheonRoute) => {
      setActiveRoute(route);
      setAmbiguousMatches([]);
      setTypedDestination(route.name);
      setWaitMinutes(route.initialWaitMinutes);
      setBusStopsAway(route.initialBusStopsAway);
      setRemainingStops(route.rideStops);
      setBusMotionState("moving");
      setDeviationCheckOpen(false);
      setSafeRecoveryMode(false);
      setRecoveryStage("none");
      setStepIndex(0);
      setExperienceMode("confirm");
      const msg = `${route.name}으로 들었어요. ${route.busNumber}번 버스 경로가 맞는지 확인해 주세요.`;
      setAssistantMessage(msg);
      speakMessage(`${route.name}으로 안내할까요? 맞으면 맞아요 버튼을 눌러 주세요.`);
    },
    [speakMessage],
  );

  const advanceTo = useCallback((nextStep: number, message: string) => {
    setTranscript("");
    setDeviationCheckOpen(false);
    setSafeRecoveryMode(false);
    setRecoveryStage("none");
    setAssistantMessage(message);
    setStepIndex(nextStep);
  }, []);

  const handleCommand = useCallback(
    (rawCommand: string) => {
      const command = rawCommand.replace(/\s/g, "");
      setTranscript(rawCommand);

      if (command.includes("처음") || command.includes("목적지바꾸")) {
        setRemainingStops(activeRoute.rideStops);
        setWaitMinutes(activeRoute.initialWaitMinutes);
        setBusStopsAway(activeRoute.initialBusStopsAway);
        setBusMotionState("moving");
        setDeviationCheckOpen(false);
        setSafeRecoveryMode(false);
        setRecoveryStage("none");
        setStepIndex(0);
        setExperienceMode("setup");
        setTypedDestination("");
        setAmbiguousMatches([]);
        const msg = "좋아요. 가고 싶은 곳을 다시 말씀하거나 선택해 주세요.";
        setAssistantMessage(msg);
        speakMessage(msg);
        return;
      }

      if (experienceMode === "setup") {
        const matched = matchChuncheonDestination(rawCommand);
        if (matched.type === "exact") {
          startRouteConfirmation(matched.route);
          return;
        }
        if (matched.type === "ambiguous") {
          setAmbiguousMatches(matched.matches);
          setAssistantMessage(matched.prompt);
          speakMessage(matched.prompt);
          return;
        }
        if (command.includes("자주가는")) {
          const favNames = CHUNCHEON_ROUTES.filter((r) => favoriteIds.includes(r.id))
            .map((r) => r.name)
            .join(", ");
          const message = `자주 가는 장소는 ${favNames || "춘천시청, 춘천성심병원"} 등이 있어요. 아래에서 눌러 바로 출발하세요.`;
          setAssistantMessage(message);
          speakMessage(message);
          return;
        }

        const message =
          "춘천시청, 춘천성심병원, 후평동 복지관, 춘천중앙시장 중에서 말씀하거나 입력해 주세요.";
        setAssistantMessage(message);
        speakMessage("춘천시청이나 성심병원처럼 가고 싶은 곳을 다시 말씀해 주세요.");
        return;
      }

      if (experienceMode === "confirm") {
        if (command.includes("응") || command.includes("맞아") || command.includes("그래")) {
          setExperienceMode("journey");
          setStepIndex(0);
          setWaitMinutes(activeRoute.initialWaitMinutes);
          setBusStopsAway(activeRoute.initialBusStopsAway);
          setRemainingStops(activeRoute.rideStops);
          setBusMotionState("moving");
          setRecoveryStage("none");
          const msg = `안내를 시작할게요. 먼저 ${activeRoute.origin} ${activeRoute.exitLabel}로 나가세요.`;
          setAssistantMessage(msg);
          speakMessage(msg);
          return;
        }

        if (command.includes("아니") || command.includes("다른")) {
          setExperienceMode("setup");
          setTypedDestination("");
          const msg = "알겠어요. 가고 싶은 곳을 다시 말씀해 주세요.";
          setAssistantMessage(msg);
          speakMessage(msg);
          return;
        }

        if (command.includes("다시")) {
          const message = `${activeRoute.name}으로 안내할까요? 맞으면 맞아요 버튼을 눌러 주세요.`;
          setAssistantMessage(message);
          speakMessage(message);
          return;
        }

        const message = `${activeRoute.name}이 맞는지 확인해 주세요. 맞아요 또는 목적지 바꾸기를 눌러 주세요.`;
        setAssistantMessage(message);
        speakMessage(message);
        return;
      }

      // Journey mode commands
      if (command.includes("다시") || command.includes("한번더")) {
        const message = `${journeyStep.title}. ${journeyStep.detail}`;
        setAssistantMessage(`네, 다시 알려드릴게요. ${message}`);
        speakMessage(message);
        return;
      }

      if (
        command.includes("도착하기직전") ||
        command.includes("도착전에") ||
        command.includes("도착하면알려")
      ) {
        const message =
          stepIndex === 3
            ? `네, ${activeRoute.destinationStopName}에 안전하게 정차하기 직전에 진동과 소리로 꼭 알려드릴게요. 지금은 ${remainingStops}정거장 남았어요.`
            : "네, 목적지 정차 직전에 진동과 소리로 먼저 알려드릴게요.";
        setAssistantMessage(message);
        speakMessage(message);
        return;
      }

      if (command.includes("잘모르") || command.includes("모르겠")) {
        setAssistantMessage(activeRoute.helpMessages[stepIndex]);
        speakMessage(activeRoute.helpMessages[stepIndex]);
        return;
      }

      // Step 2: Missed bus handling (부드러운 장진동 + 8분 대기 타이머 재설정)
      if (stepIndex === 2 && command.includes("놓쳤")) {
        setWaitMinutes(8);
        setBusStopsAway(5);
        const message =
          "버스를 놓치셨나요? 괜찮습니다. 다음 버스는 약 8분 뒤 도착할 예정입니다. 정류장 의자에 앉아 기다리시면 다시 알려드릴게요.";
        setAssistantMessage(message);
        speakMessage(message);
        triggerHaptic([450, 180, 450], "진동 알림: 다음 버스를 안내해 드릴게요");
        return;
      }

      // Step 3: Route deviation check (Principle 3: never accuse wrong boarding + 긴 경고 3회 진동)
      if (
        stepIndex === 3 &&
        (command.includes("다른길") ||
          command.includes("경로가다른") ||
          command.includes("잘못탔") ||
          command.includes("다른버스") ||
          command.includes("여기맞아"))
      ) {
        setDeviationCheckOpen(true);
        const message = `예정된 경로와 다르게 이동하고 있을 수 있어요. 버스 번호(${activeRoute.busNumber}번)를 확인해 주세요. 버스가 멈춘 뒤 안전하게 이동해 주세요.`;
        setAssistantMessage(message);
        speakMessage(message);
        triggerHaptic([700, 180, 700, 180, 700], "경고 진동: 버스 번호를 확인해 주세요");
        return;
      }

      // Step 3: Missed stop recovery (Principle 4 + 부드러운 장진동)
      if (stepIndex === 3 && command.includes("지나쳤")) {
        setDeviationCheckOpen(false);
        setSafeRecoveryMode(false);
        setRecoveryStage("missed-waiting-stop");
        const message =
          busMotionState === "moving"
            ? "하차를 못 하셨나요? 괜찮습니다. 버스가 움직이는 동안에는 일어나지 마시고, 다음 정류장에서 안전하게 내리시면 돌아가는 경로를 다시 안내해 드릴게요."
            : "하차를 못 하셨나요? 괜찮습니다. 지금 버스가 멈춰 있으니 안전하게 내리신 뒤 아래 버튼을 눌러 주세요.";
        setAssistantMessage(message);
        speakMessage(message);
        triggerHaptic([450, 180, 450], "진동 알림: 다음 정류장에서 안전하게 내리세요");
        if (busMotionState === "moving") {
          if (stopDelayRef.current) window.clearTimeout(stopDelayRef.current);
          stopDelayRef.current = window.setTimeout(() => {
            setBusMotionState("stopped");
          }, 3500);
        }
        return;
      }

      if (command.includes("맞아") || command.includes("맞지")) {
        setAssistantMessage(activeRoute.confirmationMessages[stepIndex]);
        speakMessage(activeRoute.confirmationMessages[stepIndex]);
        return;
      }

      if (command.includes("얼마나") || command.includes("몇정거장")) {
        const message =
          stepIndex === 2
            ? `${activeRoute.busNumber}번 버스는 지금 ${busStopsAway}정거장 전, 약 ${waitMinutes}분 후 도착 예정입니다.`
            : stepIndex === 3
              ? `${activeRoute.name}까지 ${remainingStops}정거장 남았어요. 버스가 완전히 정차한 뒤 내리도록 알려드릴게요.`
              : activeStep.detail;
        setAssistantMessage(message);
        speakMessage(message);
        return;
      }

      if (stepIndex === 0 && command.includes("나왔")) {
        advanceTo(1, "잘하셨어요. 이제 바로 앞 정류장으로 천천히 걸어가세요.");
        return;
      }

      if (stepIndex === 1 && command.includes("도착")) {
        setWaitMinutes(activeRoute.initialWaitMinutes);
        setBusStopsAway(activeRoute.initialBusStopsAway);
        advanceTo(
          2,
          `네, 정확히 도착하셨어요. 여기서 ${activeRoute.busNumber}번 버스를 기다리세요.`,
        );
        return;
      }

      if (stepIndex === 2 && command.includes("탔")) {
        setRemainingStops(activeRoute.rideStops);
        setBusMotionState("moving");
        setDeviationCheckOpen(false);
        setSafeRecoveryMode(false);
        setRecoveryStage("none");
        advanceTo(
          3,
          "잘 타셨어요. 자리에 앉아 계시면 내릴 때 진동과 소리로 먼저 알려드릴게요.",
        );
        return;
      }

      if (stepIndex === 3 && (command.includes("내렸") || command.includes("하차"))) {
        if (busMotionState === "moving") {
          const warnMsg =
            "지금은 버스가 달리고 있어요. 안전을 위해 버스가 완전히 정차한 뒤에 내리세요.";
          setAssistantMessage(warnMsg);
          speakMessage(warnMsg);
          return;
        }
        if (safeRecoveryMode) {
          setSafeRecoveryMode(false);
          setDeviationCheckOpen(false);
          setRecoveryStage("none");
          setWaitMinutes(activeRoute.initialWaitMinutes);
          setBusStopsAway(activeRoute.initialBusStopsAway);
          setRemainingStops(activeRoute.rideStops);
          setBusMotionState("moving");
          setStepIndex(2);
          const recoverMsg = `잘 내리셨어요. 지금 정류장에서 ${activeRoute.busNumber}번 버스가 오면 다시 안내해 드릴게요.`;
          setAssistantMessage(recoverMsg);
          speakMessage(recoverMsg);
          return;
        }
        advanceTo(
          4,
          `잘 내리셨어요. 이제 ${activeRoute.finalWalkDirection}으로 천천히 걸어가세요.`,
        );
        return;
      }

      if (stepIndex === 4 && command.includes("도착")) {
        advanceTo(5, `${activeRoute.name}에 안전하게 도착했어요. 정말 잘하셨습니다.`);
        return;
      }

      const fallbackMsg =
        "말씀을 정확히 듣지 못했어요. 아래 버튼을 누르거나 천천히 다시 말씀해 주세요.";
      setAssistantMessage(fallbackMsg);
      speakMessage(fallbackMsg);
    },
    [
      activeRoute,
      activeStep.detail,
      advanceTo,
      busMotionState,
      busStopsAway,
      experienceMode,
      favoriteIds,
      journeyStep.detail,
      journeyStep.title,
      remainingStops,
      safeRecoveryMode,
      speakMessage,
      startRouteConfirmation,
      stepIndex,
      triggerHaptic,
      waitMinutes,
    ],
  );

  // Bus Wait Countdown (Step 2) — 짧은 2회 진동 on arriving soon
  useEffect(() => {
    if (experienceMode !== "journey" || stepIndex !== 2) {
      if (waitTimerRef.current) window.clearInterval(waitTimerRef.current);
      return;
    }

    waitTimerRef.current = window.setInterval(() => {
      setWaitMinutes((prev) => {
        if (prev <= 0) return 0;
        const next = prev - 1;
        if (next === 1) {
          triggerHaptic([160, 100, 160], "진동 알림: 버스가 곧 도착합니다");
          speakMessage(
            `${activeRoute.busNumber}번 버스가 약 1분 후 도착합니다. 버스가 멈춘 뒤 탑승하세요.`,
          );
        }
        return next;
      });
      setBusStopsAway((prev) => Math.max(0, prev - 1));
    }, 9000);

    return () => {
      if (waitTimerRef.current) window.clearInterval(waitTimerRef.current);
    };
  }, [activeRoute.busNumber, experienceMode, speakMessage, stepIndex, triggerHaptic]);

  // Bus Ride Stop Progression (Step 3)
  useEffect(() => {
    if (
      experienceMode !== "journey" ||
      stepIndex !== 3 ||
      recoveryStage !== "none" ||
      safeRecoveryMode ||
      deviationCheckOpen
    ) {
      if (rideTimerRef.current) window.clearInterval(rideTimerRef.current);
      return;
    }

    rideTimerRef.current = window.setInterval(() => {
      setRemainingStops((current) => Math.max(0, current - 1));
    }, 9500);

    return () => {
      if (rideTimerRef.current) window.clearInterval(rideTimerRef.current);
    };
  }, [deviationCheckOpen, experienceMode, recoveryStage, safeRecoveryMode, stepIndex]);

  // Safety vibration & voice alerts during ride
  useEffect(() => {
    if (
      experienceMode !== "journey" ||
      stepIndex !== 3 ||
      recoveryStage !== "none" ||
      safeRecoveryMode
    ) {
      return;
    }

    if (remainingStops === 2 && busMotionState === "moving") {
      // 중간 2회 진동
      triggerHaptic([260, 120, 260], "진동 알림: 두 정거장 남았습니다");
      const msg = "두 정거장 남았어요. 아직 자리에 앉아 내릴 준비만 해주세요.";
      setAssistantMessage(msg);
      speakMessage(msg);
    }

    if (remainingStops === 1 && busMotionState === "moving") {
      // 1정거장 전 짧은 진동 알림 + 명확한 하차 준비 음성 안내
      triggerHaptic([140, 80, 140], "진동 알림: 1정거장 전 · 내릴 준비를 하세요");
      const msg = `내릴 준비를 하세요. 다음 정류장이 ${activeRoute.destinationStopName}입니다. 버스가 완전히 멈춘 뒤 안전하게 일어나세요.`;
      setAssistantMessage(`내릴 준비를 하세요. 다음은 ${activeRoute.destinationStopName}입니다.`);
      speakMessage(msg);
    }

    if (remainingStops === 0 && busMotionState === "moving") {
      const approachingMsg = `${activeRoute.destinationStopName}에 다 왔어요. 버스가 완전히 정차할 때까지 앉아 계세요.`;
      setAssistantMessage(approachingMsg);
      speakMessage(approachingMsg);

      if (stopDelayRef.current) window.clearTimeout(stopDelayRef.current);
      stopDelayRef.current = window.setTimeout(() => {
        setBusMotionState("stopped");
      }, 3200);
    }
  }, [
    activeRoute.destinationStopName,
    busMotionState,
    experienceMode,
    recoveryStage,
    remainingStops,
    speakMessage,
    stepIndex,
    triggerHaptic,
  ]);

  // Announce safe stop completion (강한 3회 진동)
  useEffect(() => {
    if (experienceMode !== "journey" || stepIndex !== 3) return;
    if (
      busMotionState === "stopped" &&
      remainingStops === 0 &&
      recoveryStage === "none" &&
      !safeRecoveryMode
    ) {
      triggerHaptic([520, 160, 520, 160, 520], "진동 알림: 정차 완료 · 이제 내리세요");
      const msg = `안전하게 정차했어요. ${activeRoute.destinationStopName}입니다. 이제 천천히 내리세요.`;
      setAssistantMessage(msg);
      speakMessage(msg);
    }
    if (busMotionState === "stopped" && safeRecoveryMode) {
      triggerHaptic([520, 160, 520, 160, 520], "진동 알림: 다음 정류장에 안전하게 정차했어요");
      const msg = "다음 정류장에 안전하게 멈췄어요. 천천히 내리신 뒤 아래 내렸어 버튼을 눌러 주세요.";
      setAssistantMessage(msg);
      speakMessage(msg);
    }
    if (busMotionState === "stopped" && recoveryStage === "missed-waiting-stop") {
      triggerHaptic([520, 160, 520, 160, 520], "진동 알림: 다음 정류장에 안전하게 정차했어요");
      const msg = "다음 정류장에 멈췄어요. 천천히 내리신 뒤 위 완료 버튼을 눌러 주세요.";
      setAssistantMessage(msg);
      speakMessage(msg);
    }
  }, [
    activeRoute.destinationStopName,
    busMotionState,
    experienceMode,
    recoveryStage,
    remainingStops,
    safeRecoveryMode,
    speakMessage,
    stepIndex,
    triggerHaptic,
  ]);

  // Speak on step transition & save trip history at arrival
  useEffect(() => {
    if (experienceMode !== "journey") return;
    const timer = window.setTimeout(() => {
      speakMessage(`${journeyStep.title}. ${journeyStep.detail}`);
    }, 350);

    if (stepIndex === 5) {
      setTripHistory((prev) => {
        const entry: TripRecord = {
          id: `trip-${Date.now()}`,
          origin: `${activeRoute.origin} ${activeRoute.exitLabel}`,
          destination: activeRoute.name,
          busNumber: activeRoute.busNumber,
          timestamp: "방금 도착",
        };
        return [entry, ...prev.slice(0, 9)];
      });

      if (guardianSharing) {
        const msgTimer = window.setTimeout(() => {
          setAssistantMessage(`보호자에게 ${activeRoute.name} 도착 안내를 보냈어요.`);
        }, 900);
        return () => {
          window.clearTimeout(timer);
          window.clearTimeout(msgTimer);
        };
      }
    }

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceMode, stepIndex]);

  useEffect(() => {
    if (!showGuardianPanel && !showHelpPanel) return;
    appShellRef.current?.scrollTo({ top: 0, behavior: "auto" });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [showGuardianPanel, showHelpPanel]);

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop();
      if (stopDelayRef.current) window.clearTimeout(stopDelayRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const startVoiceRecognition = (context: "home" | "journey") => {
    const isCurrentlyListening =
      context === "home" ? isDestinationListening : isJourneyListening;

    if (isCurrentlyListening) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const win = window as typeof window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const RecognitionCtor = win.SpeechRecognition ?? win.webkitSpeechRecognition;

    if (!RecognitionCtor) {
      setAssistantMessage(
        "이 브라우저에서는 실시간 음성 인식을 지원하지 않아요. 화면의 큰 버튼을 눌러 이용해 주세요.",
      );
      if (context === "home") destinationInputRef.current?.focus();
      return;
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => {
      if (context === "home") setIsDestinationListening(true);
      else setIsJourneyListening(true);
      setAssistantMessage("듣고 있어요. 편하게 말씀해 주세요.");
    };
    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1][0].transcript.trim();
      if (context === "home") setTypedDestination(result);
      setTranscript(result);
      handleCommand(result);
    };
    recognition.onerror = () => {
      setIsDestinationListening(false);
      setIsJourneyListening(false);
      setAssistantMessage("음성을 듣지 못했어요. 다시 말씀하거나 화면 버튼을 눌러 주세요.");
    };
    recognition.onend = () => {
      setIsDestinationListening(false);
      setIsJourneyListening(false);
    };
    speechRecognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setIsDestinationListening(false);
      setIsJourneyListening(false);
      setAssistantMessage("마이크를 시작하지 못했어요. 잠시 후 다시 눌러 주세요.");
    }
  };

  const submitTypedDestination = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const destination = typedDestination.trim();
    if (!destination) {
      setAssistantMessage("가고 싶은 장소 이름을 입력하거나 아래 장소를 눌러 주세요.");
      destinationInputRef.current?.focus();
      return;
    }
    handleCommand(destination);
  };

  const goHome = () => {
    setShowGuardianPanel(false);
    setShowHelpPanel(false);
    setExperienceMode("setup");
    setStepIndex(0);
    setTranscript("");
    setAmbiguousMatches([]);
    setDeviationCheckOpen(false);
    setSafeRecoveryMode(false);
    setRecoveryStage("none");
    setAssistantMessage("가고 싶은 곳을 말씀하시거나 아래 장소를 눌러 주세요.");
  };

  const openCurrentGuide = () => {
    setShowGuardianPanel(false);
    setShowHelpPanel(false);
    if (experienceMode !== "journey") {
      setAssistantMessage("먼저 홈에서 목적지를 고르시면 이동 동행이 시작됩니다.");
      destinationInputRef.current?.focus();
    }
  };

  const askCurrentSituation = () => {
    setShowHelpPanel(false);
    const message =
      experienceMode === "journey"
        ? `현재 ${visibleStep.place} 단계입니다. ${visibleStep.title}. ${visibleStep.detail}`
        : "아직 이동을 시작하지 않았어요. 홈에서 목적지를 먼저 정해 주세요.";
    setAssistantMessage(message);
    speakMessage(message);
  };

  const requestHelp = (command: string) => {
    setShowHelpPanel(false);
    if (experienceMode !== "journey") {
      const msg = command.includes("도착하기")
        ? "이동을 시작하면 목적지 정차 직전에 진동과 소리로 알려드릴게요."
        : "목적지를 정하고 이동을 시작하면 남은 시간과 정류장 수를 알려드릴게요.";
      setAssistantMessage(msg);
      speakMessage(msg);
      return;
    }
    handleCommand(command);
  };

  const triggerDeviationCheck = () => {
    setShowHelpPanel(false);
    setDeviationCheckOpen(true);
    const msg = `예정된 경로와 다르게 이동하고 있을 수 있어요. 버스 번호(${activeRoute.busNumber}번)를 확인해 주세요. 버스가 멈춘 뒤 안전하게 이동해 주세요.`;
    setAssistantMessage(msg);
    speakMessage(msg);
    triggerHaptic([700, 180, 700, 180, 700], "경고 진동: 버스 번호를 확인해 주세요");
  };

  const handleSendGuardianHelpSms = () => {
    const placeText = experienceMode === "journey" ? visibleStep.place : "춘천역 주변";
    const msg = `보호자(김민수)님께 ${placeText}에서 ${activeRoute.name} 이동 중 도움 요청 문자를 보냈습니다.`;
    setAssistantMessage(msg);
    speakMessage("보호자님께 도움 요청 문자를 보냈어요. 잠시 제자리에 계시면 연락드릴 거예요.");
    triggerHaptic([260, 120, 260], "진동 알림: 보호자 도움 요청 문자를 보냈어요");
  };

  const favoriteRoutes = useMemo(
    () => CHUNCHEON_ROUTES.filter((r) => favoriteIds.includes(r.id)),
    [favoriteIds],
  );

  const toggleFavorite = (id: string) => {
    setFavoriteIds((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id],
    );
  };

  const recentRoute = useMemo(() => {
    const latest = tripHistory[0];
    if (!latest) return CHUNCHEON_ROUTES[0];
    return (
      CHUNCHEON_ROUTES.find((r) => r.name === latest.destination) ?? CHUNCHEON_ROUTES[0]
    );
  }, [tripHistory]);

  return (
    <main ref={appShellRef} className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <div className="device-status" aria-label="기기 상태">
        <span>{nowTime}</span>
        <div aria-hidden="true">
          <i className="signal-icon">
            <b />
            <b />
            <b />
            <b />
          </i>
          <i className="wifi-icon" />
          <i className="battery-icon">
            <b />
          </i>
        </div>
      </div>

      <header className={`app-header ${experienceMode === "setup" ? "is-home" : ""}`}>
        <div className="home-user" aria-label="현재 안내 상태">
          <span className="home-avatar">잇</span>
          <div>
            <p>
              {experienceMode === "setup"
                ? "김상용 어르신 · 춘천시"
                : `${activeRoute.name} 동행 중`}
            </p>
            <strong>
              {experienceMode === "setup" ? "어디로 가실까요?" : visibleStep.phase}
            </strong>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className={`audio-toggle-btn ${voiceEnabled ? "is-on" : ""}`}
            onClick={() => {
              const next = !voiceEnabled;
              setVoiceEnabled(next);
              if (!next && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
              }
            }}
            aria-label={voiceEnabled ? "음성 안내 끄기" : "음성 안내 켜기"}
          >
            <Icon name={voiceEnabled ? "volume" : "volume-off"} className="h-4 w-4" />
            <span>{voiceEnabled ? "소리 켜짐" : "소리 꺼짐"}</span>
          </button>

          <button
            type="button"
            className="guardian-status"
            onClick={() => setShowGuardianPanel(true)}
            aria-label="설정 열기"
          >
            <Icon name="gear" className="h-5 w-5" />
            <span className="guardian-status-label">설정</span>
          </button>
        </div>
      </header>

      {vibrationToast && (
        <div className="vibration-toast" role="status" aria-live="polite">
          <Icon name="bell" className="h-4 w-4 shrink-0" />
          <span>{vibrationToast}</span>
        </div>
      )}

      {experienceMode === "setup" ? (
        <>
          <section className="home-top-fixed" aria-label="목적지 입력">
            <div className="home-entry">
              <form className="destination-form" onSubmit={submitTypedDestination}>
                <span className="destination-search-icon">
                  <Icon name="search" className="h-5 w-5" />
                </span>
                <input
                  ref={destinationInputRef}
                  type="search"
                  value={typedDestination}
                  onChange={(event) => {
                    setTypedDestination(event.target.value);
                    if (ambiguousMatches.length > 0) setAmbiguousMatches([]);
                  }}
                  placeholder="춘천시청, 성심병원, 복지관, 중앙시장"
                  aria-label="목적지 검색어"
                />
                <button
                  type="button"
                  className={`destination-voice-button ${
                    isDestinationListening ? "is-listening" : ""
                  }`}
                  onClick={() => startVoiceRecognition("home")}
                  aria-label={isDestinationListening ? "음성 검색 중지" : "음성으로 목적지 검색"}
                >
                  <Icon name="mic" className="h-5 w-5" />
                </button>
                <button type="submit">길 안내</button>
              </form>
              {isDestinationListening && (
                <p className="voice-search-status" aria-live="polite">
                  <span />
                  <strong>듣고 있어요.</strong> 가고 싶은 곳을 말씀해 주세요.
                </p>
              )}
              {ambiguousMatches.length > 0 && (
                <div className="disambiguation-card" role="region" aria-label="병원 선택">
                  <p>어느 병원으로 가실 건가요?</p>
                  <div className="disambiguation-choices">
                    {ambiguousMatches.map((route) => (
                      <button
                        type="button"
                        key={route.id}
                        onClick={() => startRouteConfirmation(route)}
                      >
                        <strong>{route.name}</strong>
                        <span>
                          {route.busNumber}번 · 약 {route.totalMinutes}분 →
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="home-assistant-bar" aria-live="polite">
              <span className="assistant-avatar">잇</span>
              <p>{assistantMessage}</p>
            </div>
          </section>

          <div className="home-scroll-area">
            <button
              type="button"
              className="home-feature-card"
              onClick={() => startRouteConfirmation(recentRoute)}
            >
              <span className="feature-icon">
                <Icon name="route" className="h-6 w-6" />
              </span>
              <span className="feature-copy">
                <small>최근 이용한 안내</small>
                <strong>{recentRoute.name}으로 바로 출발</strong>
                <p>
                  {recentRoute.origin} 출발 · {recentRoute.busNumber}번 버스 · 약{" "}
                  {recentRoute.totalMinutes}분
                </p>
              </span>
              <span className="feature-arrow">→</span>
            </button>

            <section className="favorite-places" aria-labelledby="favorite-title">
              <div className="section-heading">
                <div>
                  <p>FAVORITES</p>
                  <h2 id="favorite-title">자주 가는 곳</h2>
                </div>
                <span>한 번 눌러 바로 안내</span>
              </div>
              <div className="favorite-grid">
                {favoriteRoutes.map((route, idx) => (
                  <button
                    type="button"
                    key={route.id}
                    className={`favorite-card ${idx === 0 ? "primary" : ""}`}
                    onClick={() => startRouteConfirmation(route)}
                  >
                    <span
                      className={`favorite-icon ${
                        route.accentType === "hospital"
                          ? "hospital"
                          : route.accentType === "welfare"
                            ? "welfare"
                            : route.accentType === "market"
                              ? "market"
                              : ""
                      }`}
                    >
                      <Icon
                        name={route.accentType === "hospital" ? "shield" : "pin"}
                        className="h-6 w-6"
                      />
                    </span>
                    <span className="favorite-text">
                      <small>{route.shortTag}</small>
                      <strong>{route.name}</strong>
                      <p>
                        {route.busNumber}번 버스 · {route.subLabel}
                      </p>
                    </span>
                    <span className="favorite-arrow">→</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="recent-route" aria-label="최근 이동 경로">
              <div className="recent-route-head">
                <div>
                  <p>최근 이동</p>
                  <strong>
                    {recentRoute.origin}에서 {recentRoute.name}
                  </strong>
                </div>
                <span>{tripHistory[0]?.timestamp || "어제"}</span>
              </div>
              <div className="mini-route-line">
                <span className="route-node start">
                  <i />
                </span>
                <div>
                  <small>출발</small>
                  <strong>
                    {recentRoute.origin} {recentRoute.exitLabel}
                  </strong>
                </div>
                <span className="route-bus">
                  <Icon name="bus" className="h-4 w-4" /> {recentRoute.busNumber}번
                </span>
                <div>
                  <small>도착</small>
                  <strong>{recentRoute.name}</strong>
                </div>
                <span className="route-node end">
                  <i />
                </span>
              </div>
              <button type="button" onClick={() => startRouteConfirmation(recentRoute)}>
                이 경로로 다시 안내
              </button>
            </section>

            {/* Principle 5: Calm Prototype Data Transparency Note on Home */}
            <div className="data-transparency-note" role="note">
              <Icon name="shield" className="h-4 w-4" />
              <span>
                버스 도착 시간과 경로는 실제 교통 API 연동 전 프로토타입 가상 안내 데이터입니다.
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="route-summary" aria-label="현재 이동 경로">
            <div className="route-summary-top">
              {experienceMode === "confirm" ? (
                <p className="route-name">
                  <span className="route-tag">선택 목적지</span>
                  <strong>{activeRoute.name}</strong>
                </p>
              ) : (
                <p className="route-name">
                  <span>{activeRoute.origin}</span>
                  <span className="route-arrow">→</span>
                  <strong>{activeRoute.name}</strong>
                </p>
              )}
              {experienceMode === "journey" && (
                <div
                  className="progress-count"
                  aria-label={`${activeRoute.steps.length}단계 중 ${stepIndex + 1}단계`}
                >
                  <strong>{stepIndex + 1}</strong>
                  <span> / {activeRoute.steps.length}</span>
                </div>
              )}
            </div>
            <p className="data-status">
              {activeRoute.busNumber}번 버스 · 실제 교통 API 연동 전 프로토타입 가상 데이터
            </p>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section
            className={`guidance-card ${
              experienceMode === "journey" &&
              stepIndex === 3 &&
              remainingStops === 1 &&
              busMotionState === "moving" &&
              !deviationCheckOpen &&
              !safeRecoveryMode &&
              recoveryStage === "none"
                ? "is-alight-ready"
                : experienceMode === "journey" &&
                    (deviationCheckOpen ||
                      safeRecoveryMode ||
                      recoveryStage !== "none" ||
                      (stepIndex === 3 &&
                        (remainingStops === 2 || remainingStops === 0) &&
                        busMotionState === "moving"))
                  ? "is-alert"
                  : ""
            } ${
              experienceMode === "journey" &&
              (stepIndex === 5 ||
                (stepIndex === 3 &&
                  busMotionState === "stopped" &&
                  remainingStops === 0 &&
                  !safeRecoveryMode &&
                  recoveryStage === "none"))
                ? "is-complete"
                : ""
            }`}
            aria-live="polite"
          >
            <div className="guidance-top">
              <div className="guidance-meta">
                <span className="phase-badge">
                  {experienceMode === "journey" &&
                    stepIndex === 3 &&
                    remainingStops === 1 &&
                    busMotionState === "moving" &&
                    !deviationCheckOpen &&
                    !safeRecoveryMode &&
                    recoveryStage === "none" && (
                      <Icon name="bell" className="h-3.5 w-3.5 shrink-0" />
                    )}
                  <span>{visibleStep.phase}</span>
                </span>
                <span className="place-label">{visibleStep.place}</span>
              </div>

              {/* Principle 4: Explicit Bus Motion State Indicator during Ride */}
              {experienceMode === "journey" &&
                stepIndex === 3 &&
                recoveryStage !== "cross-to-opposite" &&
                recoveryStage !== "wait-return-bus" && (
                  <div
                    className={`bus-motion-banner ${
                      busMotionState === "moving" ? "is-moving" : "is-stopped"
                    }`}
                  >
                    <Icon
                      name={busMotionState === "moving" ? "bus" : "check"}
                      className="h-4 w-4 shrink-0"
                    />
                    <span>
                      {busMotionState === "moving"
                        ? "버스 주행 중 · 자리에 앉아 계세요"
                        : "정류장 정차 완료 · 안전하게 이동"}
                    </span>
                  </div>
                )}
            </div>

            <div className="guidance-hero">
              {/* Principle 2: Core Number & Action Emphasized without decorative icon */}
              {visibleStep.heroMetric && (
                <div className="hero-metric-box">
                  <p className="hero-metric-value">{visibleStep.heroMetric}</p>
                </div>
              )}

              <div className="guidance-copy">
                <h1>{visibleStep.title}</h1>
                <p className="guidance-detail">{visibleStep.detail}</p>
              </div>
            </div>

            {/* Principle 3: Non-presumptive Route Deviation Verification Card */}
            {experienceMode === "journey" && stepIndex === 3 && deviationCheckOpen && (
              <div className="deviation-panel" role="alert">
                <div className="deviation-head">
                  <Icon name="alert" className="h-5 w-5 shrink-0" />
                  <span>버스 번호를 확인해 주세요</span>
                </div>
                <p>
                  예정된 경로와 다르게 이동하고 있을 수 있어요. 버스 번호(
                  <strong>{activeRoute.busNumber}번</strong>)를 확인해 주세요. 버스가 멈춘 뒤 안전하게 이동해 주세요.
                </p>
                <div className="deviation-actions">
                  <button
                    type="button"
                    className="btn-confirm"
                    onClick={() => {
                      setDeviationCheckOpen(false);
                      setSafeRecoveryMode(false);
                      const msg = `${activeRoute.busNumber}번 버스가 맞다면 안심하고 자리에 계세요. 내릴 때 다시 알려드릴게요.`;
                      setAssistantMessage(msg);
                      speakMessage(msg);
                    }}
                  >
                    맞는 버스예요 (안내 계속)
                  </button>
                  <button
                    type="button"
                    className="btn-unsure"
                    onClick={() => {
                      setDeviationCheckOpen(false);
                      setSafeRecoveryMode(true);
                      const msg =
                        busMotionState === "moving"
                          ? "지금 버스가 움직이고 있어요. 절대 바로 일어나지 마시고, 다음 정류장에 완전히 멈춘 뒤 안전하게 내려 주세요."
                          : "버스가 멈춰 있어요. 기사님께 확인하신 뒤 천천히 내려 주세요.";
                      setAssistantMessage(msg);
                      speakMessage(msg);
                      if (busMotionState === "moving") {
                        if (stopDelayRef.current) window.clearTimeout(stopDelayRef.current);
                        stopDelayRef.current = window.setTimeout(() => {
                          setBusMotionState("stopped");
                        }, 3500);
                      }
                    }}
                  >
                    다른 버스예요 (다음 정류장 하차 후 재안내)
                  </button>
                </div>
              </div>
            )}

            {/* Missed-Stop Recovery Flow */}
            {experienceMode === "journey" && stepIndex === 3 && recoveryStage !== "none" && (
              <div className="recovery-panel" role="region" aria-label="복귀 안내">
                {recoveryStage === "missed-waiting-stop" && (
                  <>
                    <p>
                      {busMotionState === "moving"
                        ? "다음 정류장에 완전히 멈출 때까지 앉아 계세요. 정차 후 내리시면 아래 버튼이 열립니다."
                        : "정류장에 안전하게 멈췄어요. 내리신 뒤 아래 버튼을 눌러 주세요."}
                    </p>
                    <button
                      type="button"
                      disabled={busMotionState === "moving"}
                      onClick={() => {
                        setRecoveryStage("cross-to-opposite");
                        const msg =
                          "잘 내리셨어요. 횡단보도 초록불을 확인하며 반대편 정류장으로 천천히 이동해 주세요.";
                        setAssistantMessage(msg);
                        speakMessage(msg);
                      }}
                    >
                      {busMotionState === "moving"
                        ? "다음 정류장 정차 대기 중..."
                        : "다음 정류장 하차 완료"}
                    </button>
                  </>
                )}

                {recoveryStage === "cross-to-opposite" && (
                  <>
                    <p>길 건너 반대편 정류장에 안전하게 도착하셨나요?</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStage("wait-return-bus");
                        const msg = `반대편 정류장에서 ${activeRoute.busNumber}번 버스를 타시면 1정거장 뒤 ${activeRoute.destinationStopName}에 내리실 수 있어요.`;
                        setAssistantMessage(msg);
                        speakMessage(msg);
                      }}
                    >
                      반대편 정류장 도착했어요
                    </button>
                  </>
                )}

                {recoveryStage === "wait-return-bus" && (
                  <>
                    <p>반대 방향 {activeRoute.busNumber}번 버스가 멈춘 뒤 탑승해 주세요.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryStage("none");
                        setRemainingStops(1);
                        setBusMotionState("moving");
                        const msg = `잘 타셨어요. 한 정거장 뒤 ${activeRoute.destinationStopName}에 멈출 때 바로 알려드릴게요.`;
                        setAssistantMessage(msg);
                        speakMessage(msg);
                      }}
                    >
                      복귀 버스 탔어요
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="guidance-bottom">
              {experienceMode === "journey" && stepIndex === 2 && (
                <div className="transit-status" aria-label="버스 대기 상세 정보">
                  <span className="transit-status-icon">
                    <Icon name="bus" className="h-5 w-5" />
                  </span>
                  <div>
                    <small>버스 위치</small>
                    <strong>{busStopsAway === 0 ? "진입 중" : `${busStopsAway}정거장 전`}</strong>
                  </div>
                  <div>
                    <small>기다리는 곳</small>
                    <strong>{activeRoute.stopName}</strong>
                  </div>
                </div>
              )}

              {experienceMode === "journey" &&
                stepIndex === 3 &&
                recoveryStage === "none" &&
                !deviationCheckOpen && (
                  <div
                    className={`transit-status ${remainingStops <= 1 ? "is-near" : ""}`}
                    aria-label="하차 정류장 정보"
                  >
                    <span className="transit-status-icon">
                      <Icon name="bell" className="h-5 w-5" />
                    </span>
                    <div>
                      <small>내릴 정류장</small>
                      <strong>{activeRoute.destinationStopName}</strong>
                    </div>
                    <div>
                      <small>도착 예정</small>
                      <strong>
                        {remainingStops === 0
                          ? busMotionState === "stopped"
                            ? "정차 완료"
                            : "곧 정차"
                          : `약 ${Math.max(2, remainingStops * 2)}분`}
                      </strong>
                    </div>
                  </div>
                )}

              {experienceMode === "journey" && stepIndex === 5 && guardianSharing && (
                <div className="arrival-share">
                  <span className="arrival-share-icon">
                    <Icon name="shield" className="h-5 w-5" />
                  </span>
                  <div>
                    <strong>보호자 안심 문자 전송 완료</strong>
                    <p>“{activeRoute.name}에 안전하게 도착했습니다.”</p>
                  </div>
                </div>
              )}

              {!deviationCheckOpen && recoveryStage === "none" && (
                <div className="spoken-prompt">
                  <Icon name="volume" className="h-4 w-4 shrink-0" />
                  <p>{visibleStep.prompt}</p>
                </div>
              )}

              {experienceMode === "confirm" ? (
                <div className="confirm-cta-group">
                  <div className="confirm-actions">
                    <button
                      type="button"
                      className="secondary-action"
                      onClick={() => handleCommand("목적지 바꾸기")}
                    >
                      목적지 바꾸기
                    </button>
                    <button
                      type="button"
                      className="primary-action"
                      onClick={() => handleCommand("응, 맞아")}
                    >
                      맞아요, 안내 시작
                    </button>
                  </div>
                  <button
                    type="button"
                    className="replay-voice-btn is-subtle"
                    onClick={() => speakMessage(`${visibleStep.title}. ${visibleStep.detail}`)}
                  >
                    <Icon name="volume" className="h-4 w-4" />
                    <span>안내 다시 듣기</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="replay-voice-btn"
                  onClick={() => speakMessage(`${visibleStep.title}. ${visibleStep.detail}`)}
                >
                  <Icon name="volume" className="h-5 w-5" />
                  <span>안내 다시 듣기</span>
                </button>
              )}
            </div>
          </section>

          {/* Integrated Single-Bar Voice Input + Assistant Feedback Dock */}
          <section
            className={`voice-dock ${isJourneyListening ? "" : "is-paused"}`}
            aria-label="음성 대화 및 안내 응답"
          >
            <div className="voice-status">
              <button
                type="button"
                className={`voice-orb ${isJourneyListening ? "is-listening" : "is-paused"}`}
                onClick={() => startVoiceRecognition("journey")}
                aria-label={isJourneyListening ? "음성 인식 멈추기" : "마이크 눌러 말씀하기"}
              >
                <Icon name="mic" className="h-5 w-5" />
                <i />
              </button>
              <div className="voice-copy" aria-live="polite">
                <p className="voice-response">
                  {isJourneyListening ? "듣고 있어요 · 편하게 말씀해 주세요" : assistantMessage}
                </p>
                {transcript && !isJourneyListening && (
                  <p className="voice-transcript">내 말씀: “{transcript}”</p>
                )}
              </div>
              <div className="sound-bars" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="demo-commands">
              <div>
                {visibleStep.quickReplies.map((command) => (
                  <button
                    type="button"
                    key={command}
                    onClick={() => handleCommand(command)}
                  >
                    “{command}”
                  </button>
                ))}
                {experienceMode === "journey" &&
                  stepIndex === 3 &&
                  recoveryStage === "none" &&
                  !safeRecoveryMode &&
                  busMotionState === "stopped" &&
                  remainingStops === 0 && (
                    <button
                      type="button"
                      onClick={() => handleCommand("내렸어")}
                    >
                      “내렸어”
                    </button>
                  )}
                {experienceMode === "journey" && stepIndex < 3 && (
                  <button
                    type="button"
                    onClick={() => handleCommand("목적지 바꾸기")}
                  >
                    “목적지 바꾸기”
                  </button>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button
          type="button"
          className={
            experienceMode !== "journey" && !showGuardianPanel && !showHelpPanel
              ? "is-active"
              : ""
          }
          onClick={goHome}
        >
          <Icon name="home" className="h-5 w-5" />
          <span>홈</span>
        </button>
        <button
          type="button"
          className={
            experienceMode === "journey" && !showGuardianPanel && !showHelpPanel
              ? "is-active"
              : ""
          }
          onClick={openCurrentGuide}
        >
          <Icon name="route" className="h-5 w-5" />
          <span>이동 동행</span>
        </button>
        <button
          type="button"
          className={showHelpPanel ? "is-active" : ""}
          onClick={() => {
            setShowGuardianPanel(false);
            setShowHelpPanel(true);
          }}
        >
          <Icon name="help" className="h-5 w-5" />
          <span>AI 도움</span>
        </button>
        <button
          type="button"
          className={showGuardianPanel ? "is-active" : ""}
          onClick={() => {
            setShowHelpPanel(false);
            setShowGuardianPanel(true);
          }}
        >
          <Icon name="gear" className="h-5 w-5" />
          <span>설정</span>
        </button>
      </nav>

      <div className="home-indicator" aria-hidden="true" />

      {showGuardianPanel && (
        <SettingsModal
          onClose={() => setShowGuardianPanel(false)}
          voiceEnabled={voiceEnabled}
          onToggleVoice={(enabled) => {
            setVoiceEnabled(enabled);
            if (!enabled && "speechSynthesis" in window) {
              window.speechSynthesis.cancel();
            }
          }}
          voiceSpeed={voiceSpeed}
          onChangeVoiceSpeed={setVoiceSpeed}
          onTestVoice={() =>
            speakMessage("안녕하세요. 잇다 음성 안내입니다. 천천히 또박또박 안내해 드릴게요.")
          }
          vibrationEnabled={vibrationEnabled}
          onToggleVibration={setVibrationEnabled}
          onTestVibration={() =>
            triggerHaptic([260, 120, 260], "진동 확인: 내릴 때 이렇게 진동으로 알려드려요")
          }
          guardianSharing={guardianSharing}
          onToggleGuardianSharing={setGuardianSharing}
          favoriteIds={favoriteIds}
          onToggleFavorite={toggleFavorite}
          onSelectRouteFromSettings={(route) => {
            setShowGuardianPanel(false);
            startRouteConfirmation(route);
          }}
          tripHistory={tripHistory}
          onDeleteTrip={(id) => setTripHistory((prev) => prev.filter((t) => t.id !== id))}
          onClearHistory={() => setTripHistory([])}
        />
      )}

      {showHelpPanel && (
        <HelpModal
          onClose={() => setShowHelpPanel(false)}
          isInJourney={experienceMode === "journey"}
          isInBusStep={stepIndex === 3}
          currentPlace={visibleStep.place}
          destinationName={activeRoute.name}
          onAskCurrentSituation={askCurrentSituation}
          onRequestHelp={requestHelp}
          onTriggerDeviationCheck={triggerDeviationCheck}
          onSendGuardianHelpSms={handleSendGuardianHelpSms}
        />
      )}
    </main>
  );
}

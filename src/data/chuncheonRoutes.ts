export interface RouteStepCopy {
  phase: string;
  icon:
    | "arrow-up"
    | "walk"
    | "bus"
    | "seat"
    | "bell"
    | "check"
    | "mic"
    | "shield"
    | "alert";
  place: string;
  heroMetric?: string;
  title: string;
  detail: string;
  prompt: string;
  quickReplies: string[];
}

export interface ChuncheonRoute {
  id: string;
  name: string;
  shortTag: string;
  subLabel: string;
  origin: string;
  exitLabel: string;
  busNumber: string;
  stopName: string;
  destinationStopName: string;
  totalMinutes: number;
  initialWaitMinutes: number;
  initialBusStopsAway: number;
  rideStops: number;
  finalWalkDirection: string;
  finalWalkDetail: string;
  finalWalkMinutes: number;
  keywords: string[];
  accentType: "primary" | "hospital" | "welfare" | "market";
  steps: RouteStepCopy[];
  confirmationMessages: string[];
  helpMessages: string[];
}

export const CHUNCHEON_ROUTES: ChuncheonRoute[] = [
  {
    id: "cityhall",
    name: "춘천시청",
    shortTag: "관공서",
    subLabel: "민원실 · 약 24분",
    origin: "춘천역",
    exitLabel: "1번 출구",
    busNumber: "5",
    stopName: "춘천역 정류장",
    destinationStopName: "춘천시청 정류장",
    totalMinutes: 24,
    initialWaitMinutes: 3,
    initialBusStopsAway: 2,
    rideStops: 4,
    finalWalkDirection: "오른쪽 길",
    finalWalkDetail: "정류장에서 내려 오른쪽 평지를 따라 약 3분 걸어가면 시청 정문입니다.",
    finalWalkMinutes: 3,
    keywords: ["춘천시청", "시청", "민원실"],
    accentType: "primary",
    steps: [
      {
        phase: "출발",
        icon: "arrow-up",
        place: "춘천역 안",
        heroMetric: "1번 출구",
        title: "1번 출구로 나가세요",
        detail: "표지판의 큰 숫자 1을 따라 천천히 걸어가시면 됩니다.",
        prompt: "나가셨으면 “나왔어”라고 말씀해 주세요.",
        quickReplies: ["나왔어", "여기 맞아?", "잘 모르겠어"],
      },
      {
        phase: "정류장 이동",
        icon: "walk",
        place: "춘천역 1번 출구 앞",
        heroMetric: "도보 2분",
        title: "앞 정류장으로 가세요",
        detail: "출구 바로 앞 지붕이 있는 버스정류장까지 걸어서 약 2분 걸립니다.",
        prompt: "정류장에 도착하면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "버스 기다리기",
        icon: "bus",
        place: "춘천역 정류장",
        heroMetric: "3분 후 도착",
        title: "5번 버스를 타세요",
        detail: "의자에 앉아 기다리다 버스가 멈춘 뒤 천천히 탑승하세요.",
        prompt: "버스에 타시면 “탔어”라고 말씀해 주세요.",
        quickReplies: ["탔어", "놓쳤어", "얼마나 남았어?"],
      },
      {
        phase: "버스 이동 중",
        icon: "seat",
        place: "5번 버스 안",
        heroMetric: "4정거장 남음",
        title: "자리에 앉아 계세요",
        detail: "춘천시청 정류장에 가까워지면 진동과 소리로 먼저 알려드릴게요.",
        prompt: "버스가 완전히 멈춘 뒤에 일어나세요.",
        quickReplies: ["얼마나 남았어?", "다른 길로 가는 것 같아", "지나쳤어"],
      },
      {
        phase: "마지막 이동",
        icon: "walk",
        place: "춘천시청 정류장",
        heroMetric: "도보 3분",
        title: "오른쪽으로 걸어가세요",
        detail: "정류장에서 내린 방향 기준 오른쪽에 춘천시청 입구가 있습니다.",
        prompt: "도착하시면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "오른쪽 맞아?", "다시 말해줘"],
      },
      {
        phase: "도착",
        icon: "check",
        place: "춘천시청",
        heroMetric: "안내 완료",
        title: "춘천시청에 도착했어요",
        detail: "오늘도 안전하게 잘 오셨습니다.",
        prompt: "길 안내를 마칩니다.",
        quickReplies: ["처음 화면으로"],
      },
    ],
    confirmationMessages: [
      "네, 1번 출구 숫자 표지판을 따라 나가고 계시면 맞아요.",
      "네, 출구 바로 앞에 지붕이 있는 춘천역 정류장이 맞아요.",
      "네, 춘천역 정류장이 맞아요. 5번 버스가 오면 알려드릴게요.",
      "네, 춘천시청 방향으로 잘 가고 있어요. 멈출 때까지 앉아 계세요.",
      "네, 내린 방향 기준 오른쪽 큰 건물 쪽이 춘천시청입니다.",
      "춘천시청에 정확히 도착하셨어요.",
    ],
    helpMessages: [
      "괜찮아요. 천장이나 벽에 크게 적힌 숫자 1 출구 표지판을 찾아보세요.",
      "잠시 멈추셔도 돼요. 출구 밖 정면에 지붕이 있는 버스정류장이 보입니다.",
      "의자에 앉아 편히 기다리시면 5번 버스가 올 때 알려드릴게요.",
      "아직 내릴 때가 아닙니다. 버스가 완전히 정차한 뒤에 내리시면 됩니다.",
      "오른쪽 인도를 따라 조금만 걸어가시면 시청 정문이 보입니다.",
      "이미 춘천시청에 안전하게 도착하셨어요.",
    ],
  },
  {
    id: "hallym-hospital",
    name: "춘천성심병원",
    shortTag: "병원",
    subLabel: "본관 · 약 18분",
    origin: "춘천역",
    exitLabel: "1번 출구",
    busNumber: "11",
    stopName: "춘천역 정류장",
    destinationStopName: "한림대성심병원 정류장",
    totalMinutes: 18,
    initialWaitMinutes: 4,
    initialBusStopsAway: 3,
    rideStops: 3,
    finalWalkDirection: "앞쪽 횡단보도",
    finalWalkDetail: "정류장 앞 신호등을 건너 본관 정문까지 약 2분 걸립니다.",
    finalWalkMinutes: 2,
    keywords: ["춘천성심병원", "성심병원", "한림대", "한림대병원"],
    accentType: "hospital",
    steps: [
      {
        phase: "출발",
        icon: "arrow-up",
        place: "춘천역 안",
        heroMetric: "1번 출구",
        title: "1번 출구로 나가세요",
        detail: "표지판의 숫자 1을 따라 천천히 이동하세요.",
        prompt: "나가셨으면 “나왔어”라고 말씀해 주세요.",
        quickReplies: ["나왔어", "여기 맞아?", "잘 모르겠어"],
      },
      {
        phase: "정류장 이동",
        icon: "walk",
        place: "춘천역 1번 출구 앞",
        heroMetric: "도보 2분",
        title: "앞 정류장으로 가세요",
        detail: "11번 버스가 서는 정류장까지 걸어서 약 2분 걸립니다.",
        prompt: "도착하면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "버스 기다리기",
        icon: "bus",
        place: "춘천역 정류장",
        heroMetric: "4분 후 도착",
        title: "11번 버스를 타세요",
        detail: "버스가 정류장에 완전히 멈춘 뒤 천천히 탑승하세요.",
        prompt: "버스에 타시면 “탔어”라고 말씀해 주세요.",
        quickReplies: ["탔어", "놓쳤어", "얼마나 남았어?"],
      },
      {
        phase: "버스 이동 중",
        icon: "seat",
        place: "11번 버스 안",
        heroMetric: "3정거장 남음",
        title: "자리에 앉아 계세요",
        detail: "한림대성심병원 정류장 도착 전 진동과 소리로 알려드릴게요.",
        prompt: "주행 중에는 자리에서 일어나지 마세요.",
        quickReplies: ["얼마나 남았어?", "다른 길로 가는 것 같아", "지나쳤어"],
      },
      {
        phase: "마지막 이동",
        icon: "walk",
        place: "한림대성심병원 정류장",
        heroMetric: "도보 2분",
        title: "본관 입구로 가세요",
        detail: "정류장 앞 보행 신호가 켜지면 건너 본관으로 들어가세요.",
        prompt: "도착하시면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "도착",
        icon: "check",
        place: "춘천성심병원",
        heroMetric: "안내 완료",
        title: "춘천성심병원에 도착했어요",
        detail: "진료 잘 보시고 안전하게 귀가하세요.",
        prompt: "길 안내를 마칩니다.",
        quickReplies: ["처음 화면으로"],
      },
    ],
    confirmationMessages: [
      "네, 1번 출구 표지판을 따라가시면 맞아요.",
      "네, 출구 앞 춘천역 정류장이 맞습니다.",
      "네, 11번 버스를 기다리시는 게 맞아요.",
      "네, 한림대성심병원 방향으로 이동 중이에요.",
      "네, 정류장 앞 신호등을 건너면 본관 입구가 바로 보입니다.",
      "춘천성심병원에 잘 도착하셨어요.",
    ],
    helpMessages: [
      "괜찮아요. 숫자 1이 크게 적힌 출구 표지판을 찾아 천천히 나가세요.",
      "잠시 멈춰 앞을 보시면 지붕이 있는 버스정류장이 바로 있습니다.",
      "정류장 의자에 앉아 기다리시면 11번 버스가 올 때 알려드릴게요.",
      "버스가 달리는 동안엔 앉아 계세요. 정차한 뒤 내리도록 알려드릴게요.",
      "횡단보도 초록불을 확인하고 천천히 건너세요.",
      "춘천성심병원 본관 앞에 안전하게 도착하셨어요.",
    ],
  },
  {
    id: "welfare",
    name: "후평동 복지관",
    shortTag: "복지관",
    subLabel: "어르신 쉼터 · 약 28분",
    origin: "춘천역",
    exitLabel: "1번 출구",
    busNumber: "7",
    stopName: "춘천역 정류장",
    destinationStopName: "후평주공 정류장",
    totalMinutes: 28,
    initialWaitMinutes: 3,
    initialBusStopsAway: 2,
    rideStops: 5,
    finalWalkDirection: "왼쪽 평지 길",
    finalWalkDetail: "내린 방향 기준 왼쪽 인도를 따라 약 3분 걸어가면 복지관 정문입니다.",
    finalWalkMinutes: 3,
    keywords: ["후평동", "복지관", "후평", "노인복지관", "쉼터"],
    accentType: "welfare",
    steps: [
      {
        phase: "출발",
        icon: "arrow-up",
        place: "춘천역 안",
        heroMetric: "1번 출구",
        title: "1번 출구로 나가세요",
        detail: "표지판의 숫자 1을 따라 밖으로 나가세요.",
        prompt: "나가셨으면 “나왔어”라고 말씀해 주세요.",
        quickReplies: ["나왔어", "여기 맞아?", "잘 모르겠어"],
      },
      {
        phase: "정류장 이동",
        icon: "walk",
        place: "춘천역 1번 출구 앞",
        heroMetric: "도보 2분",
        title: "앞 정류장으로 가세요",
        detail: "출구 앞 정류장에서 7번 버스를 기다립니다.",
        prompt: "도착하면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "버스 기다리기",
        icon: "bus",
        place: "춘천역 정류장",
        heroMetric: "3분 후 도착",
        title: "7번 버스를 타세요",
        detail: "버스가 멈춘 뒤 손잡이를 잡고 안전하게 탑승하세요.",
        prompt: "버스에 타시면 “탔어”라고 말씀해 주세요.",
        quickReplies: ["탔어", "놓쳤어", "얼마나 남았어?"],
      },
      {
        phase: "버스 이동 중",
        icon: "seat",
        place: "7번 버스 안",
        heroMetric: "5정거장 남음",
        title: "자리에 앉아 계세요",
        detail: "후평주공 정류장에 가까워지면 진동으로 알려드릴게요.",
        prompt: "주행 중에는 움직이지 마세요.",
        quickReplies: ["얼마나 남았어?", "다른 길로 가는 것 같아", "지나쳤어"],
      },
      {
        phase: "마지막 이동",
        icon: "walk",
        place: "후평주공 정류장",
        heroMetric: "도보 3분",
        title: "왼쪽 길로 가세요",
        detail: "내린 방향 기준 왼쪽 인도를 따라 약 3분 걸어가세요.",
        prompt: "도착하시면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "왼쪽 맞아?", "다시 말해줘"],
      },
      {
        phase: "도착",
        icon: "check",
        place: "후평동 복지관",
        heroMetric: "안내 완료",
        title: "후평동 복지관에 도착했어요",
        detail: "즐겁고 편안한 시간 보내세요.",
        prompt: "길 안내를 마칩니다.",
        quickReplies: ["처음 화면으로"],
      },
    ],
    confirmationMessages: [
      "네, 1번 출구로 나가시면 맞아요.",
      "네, 앞 정류장으로 가고 계시면 맞아요.",
      "네, 7번 버스가 후평동 복지관 방면으로 갑니다.",
      "네, 잘 가고 있어요. 정류장에 멈출 때까지 앉아 계세요.",
      "네, 내리신 방향에서 왼쪽 평지 길이 복지관 방향입니다.",
      "후평동 복지관에 잘 도착하셨어요.",
    ],
    helpMessages: [
      "숫자 1이 적힌 출구 안내판을 따라 천천히 걸어가세요.",
      "출구 밖 바로 앞 지붕 있는 정류장입니다.",
      "정류장에서 7번 버스를 기다리시면 됩니다.",
      "내릴 때가 되면 진동과 큰 글씨로 먼저 알려드릴게요.",
      "잠시 멈춰 왼쪽 골목 초입의 복지관 안내판을 확인해 주세요.",
      "후평동 복지관에 도착해 안내를 마쳤습니다.",
    ],
  },
  {
    id: "market",
    name: "춘천중앙시장",
    shortTag: "전통시장",
    subLabel: "낭만시장 · 약 15분",
    origin: "춘천역",
    exitLabel: "1번 출구",
    busNumber: "2",
    stopName: "춘천역 정류장",
    destinationStopName: "중앙시장 정류장",
    totalMinutes: 15,
    initialWaitMinutes: 2,
    initialBusStopsAway: 1,
    rideStops: 2,
    finalWalkDirection: "앞쪽 시장 입구",
    finalWalkDetail: "정류장 바로 앞 지붕 있는 낭만시장 아케이드 입구까지 도보 2분입니다.",
    finalWalkMinutes: 2,
    keywords: ["중앙시장", "시장", "낭만시장", "춘천중앙시장"],
    accentType: "market",
    steps: [
      {
        phase: "출발",
        icon: "arrow-up",
        place: "춘천역 안",
        heroMetric: "1번 출구",
        title: "1번 출구로 나가세요",
        detail: "숫자 1 출구 표지판을 따라 나가세요.",
        prompt: "나가셨으면 “나왔어”라고 말씀해 주세요.",
        quickReplies: ["나왔어", "여기 맞아?", "잘 모르겠어"],
      },
      {
        phase: "정류장 이동",
        icon: "walk",
        place: "춘천역 1번 출구 앞",
        heroMetric: "도보 2분",
        title: "앞 정류장으로 가세요",
        detail: "출구 앞 정류장에서 2번 버스를 기다립니다.",
        prompt: "도착하면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "버스 기다리기",
        icon: "bus",
        place: "춘천역 정류장",
        heroMetric: "2분 후 도착",
        title: "2번 버스를 타세요",
        detail: "1정거장 전에 버스가 오고 있어요. 완전히 멈춘 뒤 탑승하세요.",
        prompt: "버스에 타시면 “탔어”라고 말씀해 주세요.",
        quickReplies: ["탔어", "놓쳤어", "얼마나 남았어?"],
      },
      {
        phase: "버스 이동 중",
        icon: "seat",
        place: "2번 버스 안",
        heroMetric: "2정거장 남음",
        title: "내릴 준비만 해주세요",
        detail: "두 정거장 뒤 중앙시장에서 내립니다. 멈출 때까지 앉아 계세요.",
        prompt: "버스가 완전히 멈춘 뒤에 일어나세요.",
        quickReplies: ["얼마나 남았어?", "다른 길로 가는 것 같아", "지나쳤어"],
      },
      {
        phase: "마지막 이동",
        icon: "walk",
        place: "중앙시장 정류장",
        heroMetric: "도보 2분",
        title: "시장 입구로 가세요",
        detail: "정류장 바로 앞 큰 아케이드 지붕이 시장 입구입니다.",
        prompt: "도착하시면 “도착했어”라고 말씀해 주세요.",
        quickReplies: ["도착했어", "여기 맞아?", "다시 말해줘"],
      },
      {
        phase: "도착",
        icon: "check",
        place: "춘천중앙시장",
        heroMetric: "안내 완료",
        title: "춘천중앙시장에 도착했어요",
        detail: "장보기 안전하게 하시고 천천히 둘러보세요.",
        prompt: "길 안내를 마칩니다.",
        quickReplies: ["처음 화면으로"],
      },
    ],
    confirmationMessages: [
      "네, 1번 출구가 맞아요.",
      "네, 앞 정류장으로 가시면 맞습니다.",
      "네, 2번 버스가 중앙시장 정류장에 바로 섭니다.",
      "네, 2정거장 뒤라 금방 도착해요. 앉아서 기다리세요.",
      "네, 정류장 바로 앞 지붕 있는 골목이 시장 입구입니다.",
      "춘천중앙시장에 도착하셨어요.",
    ],
    helpMessages: [
      "역 안 숫자 1 표지판을 따라 나가시면 됩니다.",
      "출구 바로 앞에 지붕이 있는 정류장이 보입니다.",
      "정류장에서 2번 버스가 멈출 때까지 기다려 주세요.",
      "금방 도착하니 자리에 편히 앉아 계세요.",
      "정류장 앞 낭만시장 아케이드 간판을 확인해 주세요.",
      "춘천중앙시장 입구에 안전하게 도착하셨어요.",
    ],
  },
];

export type DestinationMatchResult =
  | { type: "exact"; route: ChuncheonRoute }
  | { type: "ambiguous"; matches: ChuncheonRoute[]; prompt: string }
  | { type: "none" };

export function matchChuncheonDestination(rawInput: string): DestinationMatchResult {
  const query = rawInput.replace(/\s/g, "").toLowerCase();
  if (!query) return { type: "none" };

  if (
    query.includes("병원") &&
    !query.includes("성심") &&
    !query.includes("한림")
  ) {
    const hospitals = CHUNCHEON_ROUTES.filter((r) => r.accentType === "hospital");
    if (hospitals.length === 1) {
      return { type: "exact", route: hospitals[0] };
    }
    return {
      type: "ambiguous",
      matches: hospitals,
      prompt: "어느 병원으로 가실 건가요? 아래에서 병원을 선택해 주세요.",
    };
  }

  for (const route of CHUNCHEON_ROUTES) {
    if (route.keywords.some((kw) => query.includes(kw.toLowerCase()))) {
      return { type: "exact", route };
    }
  }

  return { type: "none" };
}

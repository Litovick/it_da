import { useState } from "react";
import { Icon } from "./Icons";
import { CHUNCHEON_ROUTES, ChuncheonRoute } from "../data/chuncheonRoutes";

export interface TripRecord {
  id: string;
  origin: string;
  destination: string;
  busNumber: string;
  timestamp: string;
}

interface SettingsModalProps {
  onClose: () => void;
  voiceEnabled: boolean;
  onToggleVoice: (enabled: boolean) => void;
  voiceSpeed: "slow" | "normal";
  onChangeVoiceSpeed: (speed: "slow" | "normal") => void;
  onTestVoice: () => void;
  vibrationEnabled: boolean;
  onToggleVibration: (enabled: boolean) => void;
  onTestVibration: () => void;
  guardianSharing: boolean;
  onToggleGuardianSharing: (enabled: boolean) => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onSelectRouteFromSettings: (route: ChuncheonRoute) => void;
  tripHistory: TripRecord[];
  onDeleteTrip: (id: string) => void;
  onClearHistory: () => void;
}

type SettingsSubView = "main" | "favorites" | "permissions" | "history";

export function SettingsModal({
  onClose,
  voiceEnabled,
  onToggleVoice,
  voiceSpeed,
  onChangeVoiceSpeed,
  onTestVoice,
  vibrationEnabled,
  onToggleVibration,
  onTestVibration,
  guardianSharing,
  onToggleGuardianSharing,
  favoriteIds,
  onToggleFavorite,
  onSelectRouteFromSettings,
  tripHistory,
  onDeleteTrip,
  onClearHistory,
}: SettingsModalProps) {
  const [subView, setSubView] = useState<SettingsSubView>("main");
  const [micCheckMessage, setMicCheckMessage] = useState<string | null>(null);

  const supportsSpeechRecognition =
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
        .SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
    );

  const supportsSpeechSynthesis =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const supportsVibration =
    typeof navigator !== "undefined" && "vibrate" in navigator;

  const checkMicPermission = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicCheckMessage(
        "이 기기에서는 브라우저 마이크 테스트를 지원하지 않습니다. 화면의 큰 말하기 버튼을 눌러 이용하실 수 있어요.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      setMicCheckMessage(
        "마이크 사용이 준비되었습니다. 홈 화면이나 이동 중 음성으로 편하게 말씀해 주세요.",
      );
    } catch {
      setMicCheckMessage(
        "마이크 권한이 꺼져 있습니다. 브라우저 설정에서 허용하시거나 화면의 큰 버튼을 눌러 이용해 주세요.",
      );
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="guardian-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guardian-title"
        onClick={(event) => event.stopPropagation()}
      >
        {subView !== "main" && (
          <button
            type="button"
            className="panel-back-btn"
            onClick={() => setSubView("main")}
          >
            <Icon name="chevron-left" className="h-5 w-5" />
            <span>설정으로 돌아가기</span>
          </button>
        )}

        {subView === "main" && (
          <>
            <span className="panel-icon">
              <Icon name="gear" className="h-7 w-7" />
            </span>
            <p className="panel-kicker">APP SETTINGS</p>
            <h2 id="guardian-title">설정</h2>
            <p className="panel-description">
              이동 중 사용할 음성·진동 알림과 보호자 안심 공유를 관리합니다.
            </p>

            <div className="settings-profile">
              <span>김</span>
              <p>
                <strong>김상용 어르신</strong>
                <small>71세 · 춘천시 후평동</small>
              </p>
            </div>

            <div className="setting-controls-group">
              <label className="consent-row">
                <span>
                  <strong>음성 안내</strong>
                  <small>
                    {voiceEnabled
                      ? `켜짐 · ${voiceSpeed === "slow" ? "천천히 (0.68x)" : "보통 (1.05x)"}`
                      : "꺼짐 · 화면과 진동으로만 안내"}
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => onToggleVoice(e.target.checked)}
                />
                <i aria-hidden="true" />
              </label>

              {voiceEnabled && (
                <div className="setting-inline-bar">
                  <div className="speed-segmented" role="group" aria-label="음성 안내 속도">
                    <button
                      type="button"
                      className={voiceSpeed === "slow" ? "is-active" : ""}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onChangeVoiceSpeed("slow");
                      }}
                    >
                      천천히
                    </button>
                    <button
                      type="button"
                      className={voiceSpeed === "normal" ? "is-active" : ""}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onChangeVoiceSpeed("normal");
                      }}
                    >
                      보통
                    </button>
                  </div>
                  <button
                    type="button"
                    className="inline-test-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTestVoice();
                    }}
                  >
                    <Icon name="volume" className="h-4 w-4" />
                    <span>소리 확인</span>
                  </button>
                </div>
              )}

              <label className="consent-row">
                <span>
                  <strong>진동 알림</strong>
                  <small>버스 도착·하차 전·정차 완료 시 진동</small>
                  <small className="ios-vibration-note">
                    아이폰 웹 브라우저에서는 진동 대신 알림음으로 안내됩니다.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={vibrationEnabled}
                  onChange={(e) => onToggleVibration(e.target.checked)}
                />
                <i aria-hidden="true" />
              </label>

              {vibrationEnabled && (
                <div className="setting-inline-bar">
                  <span className="inline-hint">주머니 속에서도 진동·알림음으로 알려드려요</span>
                  <button
                    type="button"
                    className="inline-test-btn"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onTestVibration();
                    }}
                  >
                    <Icon name="bell" className="h-4 w-4" />
                    <span>알림 확인</span>
                  </button>
                </div>
              )}
            </div>

            <div className="privacy-box">
              <strong>안심 공유 개인정보 보호</strong>
              <p>
                평소 이동 위치는 계속 전송하지 않고, 목적지에 도착했을 때만 동의한 가족에게 도착 여부를 전달합니다.
              </p>
            </div>

            <label className="consent-row">
              <span>
                <strong>도착 안내 문자</strong>
                <small>
                  {guardianSharing
                    ? "보호자 김민수 · 010-****-4821"
                    : "현재 사용하지 않음"}
                </small>
              </span>
              <input
                type="checkbox"
                checked={guardianSharing}
                onChange={(event) => onToggleGuardianSharing(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <div className="management-list">
              <button type="button" onClick={() => setSubView("favorites")}>
                <span>
                  <Icon name="pin" className="h-4 w-4" />
                </span>
                <p>
                  <strong>자주 가는 장소 관리</strong>
                  <small>{favoriteIds.length}곳 등록됨 · 홈 화면 목록 편집</small>
                </p>
                <b>›</b>
              </button>
              <button type="button" onClick={() => setSubView("permissions")}>
                <span>
                  <Icon name="mic" className="h-4 w-4" />
                </span>
                <p>
                  <strong>위치·마이크 권한</strong>
                  <small>음성 인식 및 기기 알림 상태 확인</small>
                </p>
                <b>›</b>
              </button>
              <button type="button" onClick={() => setSubView("history")}>
                <span>
                  <Icon name="history" className="h-4 w-4" />
                </span>
                <p>
                  <strong>개인정보 및 이동 기록</strong>
                  <small>최근 이용 {tripHistory.length}건 · 기록 확인 및 삭제</small>
                </p>
                <b>›</b>
              </button>
            </div>
          </>
        )}

        {subView === "favorites" && (
          <>
            <p className="panel-kicker">FAVORITE PLACES</p>
            <h2 id="guardian-title">자주 가는 장소</h2>
            <p className="panel-description">
              홈 화면에 크게 보여줄 춘천 지역 장소를 켜고 끄거나 바로 안내를 시작할 수 있어요.
            </p>
            <div className="subview-list">
              {CHUNCHEON_ROUTES.map((route) => {
                const isFav = favoriteIds.includes(route.id);
                return (
                  <div key={route.id} className="subview-item">
                    <div className="subview-item-info">
                      <strong>{route.name}</strong>
                      <small>
                        {route.busNumber}번 버스 · {route.subLabel}
                      </small>
                    </div>
                    <div className="subview-item-actions">
                      <button
                        type="button"
                        className={`chip-toggle ${isFav ? "is-selected" : ""}`}
                        onClick={() => onToggleFavorite(route.id)}
                      >
                        {isFav ? "홈 표시 중" : "홈에 추가"}
                      </button>
                      <button
                        type="button"
                        className="chip-go"
                        onClick={() => onSelectRouteFromSettings(route)}
                      >
                        출발
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {subView === "permissions" && (
          <>
            <p className="panel-kicker">DEVICE PERMISSIONS</p>
            <h2 id="guardian-title">위치·마이크 권한</h2>
            <p className="panel-description">
              안전한 음성 안내와 진동 알림을 위해 기기 권한 상태를 확인합니다.
            </p>
            <div className="setting-summary">
              <div>
                <span className="setting-mini-icon">
                  <Icon name="mic" className="h-4 w-4" />
                </span>
                <p>
                  <strong>음성 인식 (마이크)</strong>
                  <small>
                    {supportsSpeechRecognition
                      ? "말씀으로 목적지 및 응답 입력 가능"
                      : "화면의 큰 버튼을 눌러 이용 가능"}
                  </small>
                </p>
                <b className={supportsSpeechRecognition ? "is-on" : ""}>
                  {supportsSpeechRecognition ? "가능" : "버튼"}
                </b>
              </div>
              <div>
                <span className="setting-mini-icon">
                  <Icon name="volume" className="h-4 w-4" />
                </span>
                <p>
                  <strong>음성 읽어주기</strong>
                  <small>
                    {supportsSpeechSynthesis ? "한국어 음성 안내 지원됨" : "지원 안 됨"}
                  </small>
                </p>
                <b className={supportsSpeechSynthesis ? "is-on" : ""}>
                  {supportsSpeechSynthesis ? "가능" : "꺼짐"}
                </b>
              </div>
              <div>
                <span className="setting-mini-icon">
                  <Icon name="bell" className="h-4 w-4" />
                </span>
                <p>
                  <strong>진동 알림</strong>
                  <small>
                    {supportsVibration
                      ? "모바일 기기 진동 지원"
                      : "화면 알림과 함께 표시"}
                  </small>
                </p>
                <b className="is-on">준비됨</b>
              </div>
            </div>

            <div className="subview-action-stack">
              <button type="button" className="secondary-panel-btn" onClick={checkMicPermission}>
                마이크 권한 확인하기
              </button>
              {micCheckMessage && <p className="subview-feedback">{micCheckMessage}</p>}
            </div>
          </>
        )}

        {subView === "history" && (
          <>
            <p className="panel-kicker">PRIVACY & HISTORY</p>
            <h2 id="guardian-title">이동 기록 관리</h2>
            <p className="panel-description">
              저장된 이동 기록은 기기 안에만 보관되며 언제든 지우실 수 있어요.
            </p>
            {tripHistory.length === 0 ? (
              <div className="privacy-box">
                <strong>저장된 이동 기록이 없어요</strong>
                <p>목적지 안내를 완료하면 이곳에 최근 이동 기록이 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="subview-list">
                  {tripHistory.map((trip) => (
                    <div key={trip.id} className="subview-item">
                      <div className="subview-item-info">
                        <strong>
                          {trip.origin} → {trip.destination}
                        </strong>
                        <small>
                          {trip.busNumber}번 버스 · {trip.timestamp}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="icon-delete-btn"
                        aria-label={`${trip.destination} 기록 삭제`}
                        onClick={() => onDeleteTrip(trip.id)}
                      >
                        <Icon name="trash" className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="secondary-panel-btn danger"
                  onClick={onClearHistory}
                >
                  모든 이동 기록 지우기
                </button>
              </>
            )}
          </>
        )}

        <button type="button" className="panel-close" onClick={onClose}>
          확인
        </button>
      </section>
    </div>
  );
}

import { useState } from "react";
import { Icon } from "./Icons";

interface HelpModalProps {
  onClose: () => void;
  isInJourney: boolean;
  isInBusStep: boolean;
  currentPlace: string;
  destinationName: string;
  onAskCurrentSituation: () => void;
  onRequestHelp: (command: string) => void;
  onTriggerDeviationCheck: () => void;
  onSendGuardianHelpSms: () => void;
}

export function HelpModal({
  onClose,
  isInJourney,
  isInBusStep,
  currentPlace,
  destinationName,
  onAskCurrentSituation,
  onRequestHelp,
  onTriggerDeviationCheck,
  onSendGuardianHelpSms,
}: HelpModalProps) {
  const [smsSent, setSmsSent] = useState(false);

  const handleSendHelpSms = () => {
    setSmsSent(true);
    onSendGuardianHelpSms();
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="guardian-panel help-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
        onClick={(event) => event.stopPropagation()}
      >
        <span className="panel-icon help">
          <Icon name="help" className="h-7 w-7" />
        </span>
        <p className="panel-kicker">AI HELP</p>
        <h2 id="help-title">어떤 도움이 필요하세요?</h2>
        <p className="panel-description">
          불안하거나 헷갈릴 때 눌러 주시면 안전한 다음 행동을 천천히 알려드릴게요.
        </p>

        <div className="help-actions">
          <button type="button" onClick={onAskCurrentSituation}>
            <span>
              <Icon name="pin" className="h-5 w-5" />
            </span>
            <p>
              <strong>지금 어디야?</strong>
              <small>현재 이동 단계 확인</small>
            </p>
          </button>
          <button type="button" onClick={() => onRequestHelp("다시 말해줘")}>
            <span>
              <Icon name="volume" className="h-5 w-5" />
            </span>
            <p>
              <strong>다시 알려줘</strong>
              <small>현재 안내 다시 듣기</small>
            </p>
          </button>
          <button type="button" onClick={() => onRequestHelp("얼마나 남았어?")}>
            <span>
              <Icon name="bus" className="h-5 w-5" />
            </span>
            <p>
              <strong>몇 분 남았어?</strong>
              <small>남은 정류장과 시간</small>
            </p>
          </button>
          <button type="button" onClick={() => onRequestHelp("도착하기 직전에 말해줘")}>
            <span>
              <Icon name="bell" className="h-5 w-5" />
            </span>
            <p>
              <strong>내릴 때 알려줘</strong>
              <small>정차 후 진동·음성 알림</small>
            </p>
          </button>
        </div>

        {isInJourney && isInBusStep && (
          <button
            type="button"
            className="help-safety-check-btn"
            onClick={onTriggerDeviationCheck}
          >
            <Icon name="alert" className="h-5 w-5 shrink-0" />
            <div>
              <strong>버스가 다른 길로 가는 것 같아요</strong>
              <small>버스 번호 확인 및 안전 정차 안내 받기</small>
            </div>
          </button>
        )}

        <button
          type="button"
          className={`guardian-sos-btn ${smsSent ? "is-sent" : ""}`}
          onClick={handleSendHelpSms}
        >
          <Icon name="shield" className="h-5 w-5 shrink-0" />
          <div>
            <strong>
              {smsSent
                ? "보호자(김민수)님께 도움 요청을 보냈어요"
                : "보호자에게 도움 요청 문자 보내기"}
            </strong>
            <small>
              {smsSent
                ? `전송 내용: “${currentPlace}에서 ${destinationName} 이동 중 도움이 필요해요”`
                : "보호자 김민수(010-****-4821)에게 현재 위치와 상태 전달"}
            </small>
          </div>
        </button>

        <div className="uncertainty-note">
          <Icon name="shield" className="h-4 w-4" />
          <p>
            위치만으로 잘못 탔다고 단정하지 않으며, 버스가 달리는 동안에는 절대 바로 내리라고 안내하지 않습니다.
          </p>
        </div>

        <button type="button" className="panel-close" onClick={onClose}>
          닫기
        </button>
      </section>
    </div>
  );
}

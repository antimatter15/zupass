import { ticketDisplayName } from "@pcd/eddsa-ticket-pcd";
import {
  ActionConfigResponseValue,
  RateLimitedBadge
} from "@pcd/passport-interface";
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useState
} from "react";
import styled from "styled-components";
import { Button, Spacer } from "../../../../../../core";
import { RippleLoader } from "../../../../../../core/RippleLoader";
import { useExecuteTicketAction } from "../useExecuteTicketAction";

export function PerDayBadges({
  precheck,
  eventId,
  ticketId,
  setInProgress,
  isLoading
}: {
  precheck: ActionConfigResponseValue;
  eventId: string;
  ticketId: string;
  setInProgress: Dispatch<SetStateAction<boolean>>;
  isLoading: boolean;
}): ReactNode {
  const options = precheck.giveBadgeActionInfo?.rateLimitedBadges ?? [];
  const [giving, setGiving] = useState(false);

  const wrappedSetInProgress = useCallback(
    (inProgress) => {
      setGiving(inProgress);
      setInProgress(inProgress);
    },
    [setInProgress]
  );

  if (giving) {
    return (
      <>
        <Spacer h={8} />
        <RippleLoader />
      </>
    );
  }

  if (isLoading) {
    return null;
  }

  return (
    <Container>
      {options.map((o) => {
        return (
          <PerDayBadgeButton
            o={o}
            key={o.id}
            eventId={eventId}
            ticketId={ticketId}
            setInProgress={wrappedSetInProgress}
          />
        );
      })}
    </Container>
  );
}

function PerDayBadgeButton({
  o,
  eventId,
  ticketId,
  setInProgress
}: {
  o: RateLimitedBadge;
  eventId: string;
  ticketId: string;
  setInProgress: Dispatch<SetStateAction<boolean>>;
}): ReactNode {
  const isDisabled = o.alreadyGivenInInterval >= o.maxInInterval;
  const leftToGive = o.maxInInterval - o.alreadyGivenInInterval;
  const giveBadge = useExecuteTicketAction({
    eventId,
    ticketId,
    action: {
      giftBadge: {
        badgeIds: [o.id]
      }
    }
  });
  const onClick = useCallback(async () => {
    setInProgress(true);
    giveBadge.execute().finally(() => {
      setInProgress(false);
    });
  }, [giveBadge, setInProgress]);
  const earliestTimestamp = Math.min(...o.timestampsGiven);
  const nextBadgeAvailable = earliestTimestamp + o.intervalMs;
  const [now, setNow] = useState(Date.now());
  const msUntilNextBadgeAvailable = nextBadgeAvailable - now;

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 100);
    return () => clearInterval(interval);
  }, []);

  if (isDisabled) {
    return (
      <Row>
        <Button disabled={true}>
          Give {ticketDisplayName(o.eventName, o.productName)} (Next Available
          in {Math.floor(msUntilNextBadgeAvailable / 1000 / 60 / 60)}h)
        </Button>
      </Row>
    );
  }

  return (
    <Row>
      <Button onClick={onClick}>
        Give {ticketDisplayName(o.eventName, o.productName)} ({leftToGive} left
        today)
      </Button>
    </Row>
  );
}

export const Container = styled.div``;

export const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-direction: row;
  gap: 8px;
  margin-bottom: 8px;

  button {
    flex-grow: 1;
  }
`;

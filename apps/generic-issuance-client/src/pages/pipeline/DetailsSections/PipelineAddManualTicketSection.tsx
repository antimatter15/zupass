import {
  Button,
  FormControl,
  FormLabel,
  Input,
  Select
} from "@chakra-ui/react";
import {
  LemonadePipelineDefinition,
  PipelineDefinition,
  PipelineType,
  PretixPipelineDefinition,
  isLemonadePipelineDefinition,
  isPretixPipelineDefinition
} from "@pcd/passport-interface";
import { randomUUID, validateEmail } from "@pcd/util";
import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { savePipeline } from "../../../helpers/Mutations";
import { useJWT } from "../../../helpers/userHooks";

export function supportsAddingManualTickets(
  pipeline: PipelineDefinition
): pipeline is SupportsAddingManualTicketPipelineDefinition {
  return (
    isLemonadePipelineDefinition(pipeline) ||
    isPretixPipelineDefinition(pipeline)
  );
}

type SupportsAddingManualTicketPipelineDefinition =
  | LemonadePipelineDefinition
  | PretixPipelineDefinition;

/**
 * For {@link LemonadePipeline} only. Shows a form that lets admins
 * add manual tickets.
 */
export function PipelineAddManualTicketSection({
  pipeline
}: {
  pipeline: PipelineDefinition;
  isAdminView: boolean;
}): ReactNode {
  let content = <></>;

  if (supportsAddingManualTickets(pipeline)) {
    content = <AddManualTicket pipeline={pipeline} />;
  } else {
    content = <div>unsupported pipeline type</div>;
  }

  return <div>{content}</div>;
}

function getEventOptions(
  pipeline: SupportsAddingManualTicketPipelineDefinition
): IOption[] {
  switch (pipeline.type) {
    case PipelineType.Lemonade:
      return pipeline.options.events.map((e) => {
        return {
          value: e.genericIssuanceEventId,
          name: e.name
        };
      });
    case PipelineType.Pretix: {
      return pipeline.options.events.map((e) => {
        return {
          value: e.genericIssuanceId,
          name: e.name
        };
      });
    }
  }
}

function getEventProductOptions(
  pipeline: SupportsAddingManualTicketPipelineDefinition,
  eventId: string
): IOption[] {
  switch (pipeline.type) {
    case PipelineType.Lemonade: {
      const event = pipeline.options.events.find(
        (e) => e.genericIssuanceEventId === eventId
      );

      if (event) {
        return event.ticketTypes.map((t) => ({
          name: t.name,
          value: t.genericIssuanceProductId
        }));
      } else {
        return [];
      }
    }
    case PipelineType.Pretix: {
      const event = pipeline.options.events.find(
        (e) => e.genericIssuanceId === eventId
      );

      if (event) {
        return event.products.map((t) => ({
          name: t.name,
          value: t.genericIssuanceId
        }));
      } else {
        return [];
      }
    }
  }
}

function AddManualTicket({
  pipeline
}: {
  pipeline: SupportsAddingManualTicketPipelineDefinition;
}): ReactNode {
  const userJWT = useJWT();
  const [inProgress, setInProgress] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const eventIdOptions: IOption[] = useMemo(() => {
    return getEventOptions(pipeline);
  }, [pipeline]);

  const [eventId, setEventId] = useState(eventIdOptions?.[0].value ?? "");
  const [eventName, setEventName] = useState(eventIdOptions?.[0].name ?? "");

  const ticketTypeIdOptions: IOption[] = useMemo(() => {
    return getEventProductOptions(pipeline, eventId);
  }, [eventId, pipeline]);

  const [ticketTypeId, setTicketTypeId] = useState(
    ticketTypeIdOptions?.[0]?.value ?? ""
  );
  const [ticketTypeName, setTicketTypeName] = useState(
    ticketTypeIdOptions?.[0]?.name ?? ""
  );

  useEffect(() => {
    setEventName(eventIdOptions.find((e) => e.value === eventId)?.name ?? "");
    setTicketTypeName(
      ticketTypeIdOptions.find((e) => e.value === ticketTypeId)?.name ?? ""
    );
  }, [ticketTypeId, eventId, eventIdOptions, ticketTypeIdOptions]);

  const onAddClick = useCallback(async () => {
    if (name.length === 0) {
      alert("please enter a name");
      return;
    }

    if (email.length === 0) {
      alert("please enter an email");
      return;
    }

    if (!validateEmail(email)) {
      alert("please enter a valid email");
      return;
    }

    const pipelineCopy = JSON.parse(
      JSON.stringify(pipeline)
    ) as SupportsAddingManualTicketPipelineDefinition;

    pipelineCopy.options.manualTickets =
      pipelineCopy.options.manualTickets ?? [];

    pipelineCopy.options.manualTickets.push({
      attendeeEmail: email,
      attendeeName: name,
      eventId,
      productId: ticketTypeId,
      id: randomUUID()
    });

    if (
      !confirm(
        `are you sure you want to add this ticket?

name: ${name}
email: ${email}
event: ${eventName}
ticket: ${ticketTypeName}`
      )
    ) {
      return;
    }

    if (!userJWT) {
      alert("not logged in");
      return;
    }

    setInProgress(true);
    const res = await savePipeline(userJWT, JSON.stringify(pipelineCopy));

    if (res.success) {
      window.location.reload();
    } else {
      setInProgress(false);
      alert(res.error);
    }
  }, [
    email,
    eventId,
    eventName,
    name,
    pipeline,
    ticketTypeId,
    ticketTypeName,
    userJWT
  ]);

  return (
    <>
      <FormControl mb={2}>
        <FormLabel>Event</FormLabel>
        <Select
          maxW={"100%"}
          w="sm"
          mt={2}
          value={eventId}
          onChange={(e): void => setEventId(e.target.value)}
        >
          {eventIdOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.name}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl mb={2}>
        <FormLabel>Ticket Type</FormLabel>
        <Select
          maxW={"100%"}
          w="sm"
          mt={2}
          value={ticketTypeId}
          onChange={(e): void => setTicketTypeId(e.target.value)}
        >
          {ticketTypeIdOptions.map((o) => (
            <option value={o.value} key={o.value}>
              {o.name}
            </option>
          ))}
        </Select>
      </FormControl>

      <FormControl mb={2}>
        <FormLabel>Attendee Name</FormLabel>
        <Input
          value={name}
          onChange={(e): void => setName(e.target.value)}
          placeholder="Bob Glob"
          type="text"
          width="sm"
          maxW={"100%"}
        />
      </FormControl>

      <FormControl mb={2}>
        <FormLabel>Attendee Email</FormLabel>
        <Input
          isInvalid={!validateEmail(email) && email.length !== 0}
          value={email}
          onChange={(e): void => setEmail(e.target.value)}
          placeholder="email@provider.tld"
          type="email"
          width="sm"
          maxW={"100%"}
          autoComplete="off"
          data-1p-ignore
        />
      </FormControl>

      <Button
        colorScheme="blue"
        mt={1}
        width="sm"
        maxW={"100%"}
        onClick={onAddClick}
        isLoading={inProgress}
      >
        Add Ticket
      </Button>
    </>
  );
}

/**
 * For use in <select> element.
 */
interface IOption {
  value: string;
  name: string;
}

import { EmailPCD, getEmailAddress } from "@pcd/email-pcd";
import { styled } from "@pcd/passport-ui";
import { PCDUI } from "@pcd/pcd-types";

export const EmailPCDUI: PCDUI<EmailPCD> = {
  renderCardBody: EmailCardBody
};

function EmailCardBody({ pcd }: { pcd: EmailPCD }): JSX.Element {
  const emailAddress = getEmailAddress(pcd);

  return (
    <Container>
      <EmailInfo>
        <span>{emailAddress}</span> <br />
        <span>Semaphore ID: {pcd.claim.semaphoreId}</span> <br />
        <span>Semaphore V4 ID: {pcd.claim.semaphoreV4Id}</span>
      </EmailInfo>
    </Container>
  );
}

const Container = styled.span`
  padding: 16px;
  overflow: hidden;
  width: 100%;
`;

const EmailInfo = styled.div`
  margin-top: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

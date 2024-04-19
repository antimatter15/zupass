import { useCallback, useEffect } from "react";
import { useQuery } from "../../../src/appHooks";
import { hasPendingRequest } from "../../../src/sessionStorage";
import { Button, H2, Spacer, TextCenter } from "../../core";
import { MaybeModal } from "../../modals/Modal";
import { AppContainer } from "../../shared/AppContainer";
import { PrivacyNotice } from "../../shared/PrivacyNotice";

export function PrivacyNoticeScreen(): JSX.Element | null {
  const query = useQuery();
  const email = query?.get("email");
  const token = query?.get("token");

  const onClick = useCallback(() => {
    if (!email || !token) return;
    window.location.hash = `#/create-password?email=${encodeURIComponent(
      email
    )}&token=${encodeURIComponent(token)}`;
  }, [email, token]);

  useEffect(() => {
    if (!email || !token) {
      if (hasPendingRequest()) {
        window.location.hash = "#/login-interstitial";
      } else {
        window.location.hash = "#/";
      }
    }
  }, [email, token]);

  if (!email || !token) {
    return null;
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <Spacer h={64} />
        <TextCenter>
          <H2>Terms of Use</H2>
          <Spacer h={24} />
          <p>To begin using Zupass, please agree to the following terms:</p>
          <PrivacyNotice />
          <Spacer h={8} />
          <Button onClick={onClick}>Agree</Button>
        </TextCenter>
      </AppContainer>
    </>
  );
}

import { PCDCrypto } from "@pcd/passport-crypto";
import {
  ConfirmEmailResult,
  requestConfirmationEmail,
  requestDownloadAndDecryptStorage,
  requestLogToServer
} from "@pcd/passport-interface";
import { sleep } from "@pcd/util";
import {
  FormEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState
} from "react";
import { appConfig } from "../../src/appConfig";
import { useDispatch, useQuery, useSelf } from "../../src/appHooks";
import {
  BackgroundGlow,
  BigInput,
  Button,
  CenterColumn,
  H2,
  HR,
  Spacer,
  TextCenter
} from "../core";
import { ErrorMessage } from "../core/error";
import { RippleLoader } from "../core/RippleLoader";
import { MaybeModal } from "../modals/Modal";
import { AppContainer } from "../shared/AppContainer";
import { PasswordInput } from "../shared/PasswordInput";

export function AlreadyRegisteredScreen() {
  const dispatch = useDispatch();
  const self = useSelf();
  const query = useQuery();
  const email = query?.get("email");
  const salt = query?.get("salt");
  const identityCommitment = query?.get("identityCommitment");
  const [error, setError] = useState<string | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [sendingConfirmationEmail, setSendingConfirmationEmail] =
    useState(false);
  const [password, setPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);

  const handleConfirmationEmailResult = useCallback(
    async (result: ConfirmEmailResult) => {
      if (!result.success) {
        setError("Couldn't send pasword reset email. Try again later.");
        setSendingConfirmationEmail(false);
      } else if (result.value?.devToken != null) {
        setSendingConfirmationEmail(false);
        await dispatch({
          type: "verify-token",
          email,
          token: result.value.devToken
        });
      } else {
        window.location.href = `#/enter-confirmation-code?email=${encodeURIComponent(
          email
        )}&identityCommitment=${encodeURIComponent(identityCommitment)}`;
      }
    },
    [dispatch, email, identityCommitment]
  );

  const onOverwriteClick = useCallback(async () => {
    requestLogToServer(appConfig.zupassServer, "overwrite-account-click", {
      email,
      identityCommitment
    });

    setSendingConfirmationEmail(true);
    const emailConfirmationResult = await requestConfirmationEmail(
      appConfig.zupassServer,
      email,
      identityCommitment,
      true
    );
    handleConfirmationEmailResult(emailConfirmationResult);
  }, [email, identityCommitment, handleConfirmationEmailResult]);

  const onLoginWithMasterPasswordClick = useCallback(() => {
    requestLogToServer(
      appConfig.zupassServer,
      "login-with-master-password-click",
      {
        email,
        identityCommitment
      }
    );
    window.location.href = "#/sync-existing";
  }, [email, identityCommitment]);

  const onSubmitPassword = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setError(undefined);

      if (password == "" || password == null) {
        return setError("Enter a password");
      }

      setIsLoggingIn(true);
      await sleep(10);
      const crypto = await PCDCrypto.newInstance();
      const encryptionKey = await crypto.argon2(password, salt, 32);
      const storageResult = await requestDownloadAndDecryptStorage(
        appConfig.zupassServer,
        encryptionKey
      );
      setIsLoggingIn(false);

      if (!storageResult.success) {
        return setError(
          "Password incorrect. Double-check your password. " +
            "If you've lost access, you can reset your account below."
        );
      }

      dispatch({
        type: "load-from-sync",
        storage: storageResult.value,
        encryptionKey: encryptionKey
      });
    },
    [dispatch, password, salt]
  );

  const onCancelClick = useCallback(() => {
    window.location.href = "#/";
  }, []);

  useEffect(() => {
    if (self || !email) {
      window.location.href = "#/";
    }
  }, [self, email]);

  // scroll to top when we navigate to this page
  useLayoutEffect(() => {
    document.body.scrollTop = document.documentElement.scrollTop = 0;
  }, []);

  if (self || !email) {
    return null;
  }

  let content = null;
  if (sendingConfirmationEmail) {
    content = (
      <TextCenter>
        <Spacer h={128} />
        Sending you an email with a reset token...
        <Spacer h={24} />
        <RippleLoader />
      </TextCenter>
    );
  } else if (isLoggingIn) {
    content = (
      <TextCenter>
        <Spacer h={128} />
        Logging you in...
        <Spacer h={24} />
        <RippleLoader />
      </TextCenter>
    );
  } else {
    content = (
      <>
        <Spacer h={64} />

        <TextCenter>
          <H2>Welcome Back</H2>
          <Spacer h={24} />
          Enter your password below to continue. If you've lost your password,
          you can reset your account. Resetting your account will let you access
          your tickets, but you'll lose all non-ticket PCDs.
        </TextCenter>

        <Spacer h={24} />

        <BigInput value={email} disabled={true} readOnly />

        <Spacer h={8} />

        {/*
         * If a user has a `salt` field, then that means they chose their own password
         * and we saved the randomly generated salt for them. This is default true for
         * new PCDPass accounts, but false for Zupass accounts, where we give them a
         * Sync Key instead.
         */}

        {salt ? (
          <form onSubmit={onSubmitPassword}>
            <PasswordInput
              autoFocus
              value={password}
              setValue={setPassword}
              placeholder="Password"
              revealPassword={revealPassword}
              setRevealPassword={setRevealPassword}
            />
            {error && (
              <>
                <Spacer h={16} />
                <ErrorMessage>{error}</ErrorMessage>
                <Spacer h={8} />
              </>
            )}
            <Spacer h={8} />
            <Button type="submit">Login</Button>
          </form>
        ) : (
          <Button onClick={onLoginWithMasterPasswordClick}>
            Login with Sync Key
          </Button>
        )}

        <Spacer h={24} />
        <HR />
        <Spacer h={24} />

        <Button onClick={onCancelClick}>Cancel</Button>
        <Spacer h={8} />
        <Button onClick={onOverwriteClick} style="danger">
          Reset Account
        </Button>
      </>
    );
  }

  return (
    <>
      <MaybeModal />
      <AppContainer bg="primary">
        <BackgroundGlow
          y={224}
          from="var(--bg-lite-primary)"
          to="var(--bg-dark-primary)"
        >
          <CenterColumn w={280}>{content}</CenterColumn>
        </BackgroundGlow>
        <Spacer h={64} />
      </AppContainer>
    </>
  );
}

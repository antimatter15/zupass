import { LoginConfig } from "@pcd/zupoll-shared";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LoginState } from "./types";

const ACCESS_TOKEN_KEY = "access_token";
const CONFIGURATION_KEY = "configuration";
const STATE_VERSION_KEY = "state_version";
const LATEST_STATE_VERSION = "5";

export function loadLoginStateFromLocalStorage(): LoginState | undefined {
  const savedToken: string | undefined = localStorage[ACCESS_TOKEN_KEY];
  const savedLoginConfig: string | undefined = localStorage[CONFIGURATION_KEY];
  const savedStateVersion: string | undefined = localStorage[STATE_VERSION_KEY];

  if (savedStateVersion !== LATEST_STATE_VERSION) {
    return undefined;
  }

  let parsedLoginConfig: LoginConfig | undefined;
  try {
    parsedLoginConfig = JSON.parse(savedLoginConfig as any);
  } catch (e) {
    //
  }

  if (!savedToken || !parsedLoginConfig) {
    return undefined;
  }

  return {
    token: savedToken,
    config: parsedLoginConfig
  };
}

export function clearLoginStateFromLocalStorage(): void {
  localStorage.clear();
}

export function saveLoginStateToLocalStorage(
  state: LoginState | undefined
): void {
  if (!state) {
    clearLoginStateFromLocalStorage();
  } else {
    localStorage.setItem(ACCESS_TOKEN_KEY, state.token);
    localStorage.setItem(CONFIGURATION_KEY, JSON.stringify(state.config));
    localStorage.setItem(STATE_VERSION_KEY, LATEST_STATE_VERSION);
  }
}

export function useSavedLoginState(router: AppRouterInstance): SavedLoginState {
  const [loginState, setLoginInfo] = useState<LoginState | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedLoginState = loadLoginStateFromLocalStorage();

    if (!savedLoginState) {
      clearLoginStateFromLocalStorage();
    } else {
      setLoginInfo(savedLoginState);
    }

    setIsLoading(false);
  }, []);

  const replaceLoginState = useCallback((state: LoginState | undefined) => {
    setLoginInfo(state);
    saveLoginStateToLocalStorage(state);
  }, []);

  const logout: SavedLoginState["logout"] = useCallback(
    (ballotURL?: string, configId?: string, ballotConfigId?: string) => {
      alert("logout");
      // replaceLoginState(undefined);
      saveLoginStateToLocalStorage(undefined);

      setTimeout(() => {
        const loginUrl = `/#/?ballotURL=${encodeURIComponent(
          ballotURL ?? ""
        )}&configId=${encodeURIComponent(
          configId ?? ""
        )}&ballotConfigId=${encodeURIComponent(ballotConfigId ?? "")}`;
        alert(`redirecting to ${loginUrl}`);
        window.location.href = loginUrl;
        // router.push(loginUrl);
      }, 100);
      delete localStorage.preLoginRoute;
    },
    []
  );

  const definitelyNotLoggedIn = useMemo(() => {
    return !loginState && !isLoading;
  }, [isLoading, loginState]);

  return {
    loginState,
    replaceLoginState,
    isLoading,
    logout,
    definitelyNotLoggedIn
  };
}

export interface SavedLoginState {
  loginState: LoginState | undefined;
  isLoading: boolean;
  definitelyNotLoggedIn: boolean;
  replaceLoginState: (state: LoginState | undefined) => void;
  logout: (
    ballotURL?: string,
    configId?: string,
    ballotConfigId?: string
  ) => void;
}

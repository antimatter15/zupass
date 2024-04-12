import { eventMetadata } from "@/metadata";
import { zuAuth } from "@pcd/zuauth";
import { Inter } from "next/font/google";
import { useCallback, useEffect, useReducer, useState } from "react";

const inter = Inter({ subsets: ["latin"] });

type AuthState =
  | "logged out"
  | "auth-start"
  | "authenticating"
  | "authenticated"
  | "error";

export default function Home() {
  const [pcdStr, setPcdStr] = useState<string>("");
  const [authState, setAuthState] = useState<AuthState>("logged out");
  const [log, addLog] = useReducer((state: string, toAdd: string) => {
    return `${state}${state === "" ? "" : "\n"}${toAdd}`;
  }, "");
  const [user, setUser] = useState<Record<string, string> | undefined>();

  useEffect(() => {
    (async () => {
      if (authState === "auth-start") {
        addLog("Fetching watermark");
        const watermark = (await (await fetch("/api/watermark")).json())
          .watermark;
        addLog("Got watermark");
        addLog("Opening popup window");
        setAuthState("authenticating");
        const result = await zuAuth({
          zupassUrl: process.env.NEXT_PUBLIC_ZUPASS_SERVER_URL as string,
          popupRoute: window.origin + "/popup",
          fieldsToReveal: {
            revealAttendeeEmail: true,
            revealAttendeeName: true
          },
          watermark,
          eventMetadata
        });

        if (result.type === "pcd") {
          addLog("Received PCD");
          setPcdStr(result.pcdStr);

          const loginResult = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pcd: result.pcdStr })
          });

          setUser((await loginResult.json()).user);
          addLog("Authenticated successfully");
          setAuthState("authenticated");
        }
        if (result.type === "popupBlocked") {
          addLog("The popup was blocked by your browser");
          setAuthState("error");
        }
        if (result.type === "popupClosed") {
          addLog("The popup was closed before a result was received");
          setAuthState("error");
        }
      }
    })();
  }, [addLog, authState]);

  const auth = useCallback(() => {
    if (authState === "logged out" || authState === "error") {
      addLog("Beginning authentication");
      setAuthState("auth-start");
    }
  }, [addLog, authState]);

  const logout = useCallback(() => {
    setUser(undefined);
    setPcdStr("");
    setAuthState("logged out");
    addLog("Logged out");
  }, []);

  const stateClasses: Record<AuthState, string> = {
    "logged out": "",
    "auth-start": "text-blue-300",
    authenticated: "text-green-300",
    error: "text-red-300",
    authenticating: "text-blue-300"
  };

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-between p-24 ${inter.className}`}
    >
      <div className="z-10 max-w-5xl w-full text-sm">
        <button
          onClick={authState === "authenticated" ? logout : auth}
          className="border rounded border-gray-400 px-4 py-2 font-medium text-md"
          disabled={
            authState === "auth-start" || authState === "authenticating"
          }
        >
          {authState === "authenticated" ? `Log out` : `Authenticate`}
        </button>
        <div className="my-4">
          Current authentication state is{" "}
          <span className={`font-semibold ${stateClasses[authState]}`}>
            {authState}
          </span>{" "}
          {user && (
            <>
              as{" "}
              <span className="font-medium text-yellow-200">{`${user.attendeeName} (${user.attendeeEmail})`}</span>
            </>
          )}
        </div>
        <h3 className="text-lg font-semibold my-2">Log</h3>
        <pre className="whitespace-pre-line border rounded-md border-gray-500 px-2 py-1">
          {log}
        </pre>
        <h3 className="text-lg font-semibold mt-2">PCD</h3>
        <pre className="whitespace-pre-line border rounded-md border-gray-500 px-2 py-1">
          {pcdStr}
        </pre>
      </div>
    </main>
  );
}

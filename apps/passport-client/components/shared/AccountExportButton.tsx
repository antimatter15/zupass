import { serializeStorage } from "@pcd/passport-interface";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  usePCDCollection,
  useSelf,
  useSubscriptions
} from "../../src/appHooks";
import { NewButton } from "../NewButton";

export function AccountExportButton(): JSX.Element | null {
  const user = useSelf();
  const pcds = usePCDCollection();
  const subscriptions = useSubscriptions();

  const [url, setUrl] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);

  const showToast = useCallback(() => {
    toast("Account data exported", { position: "bottom-center" });
  }, []);

  useEffect(() => {
    (async (): Promise<void> => {
      if (user) {
        // Since we already use this data for remote sync, we know that it's
        // sufficient for loading an account on to a new device.
        const { serializedStorage, storageHash } = await serializeStorage(
          user,
          pcds,
          subscriptions.value
        );

        // Data in a data URL must be Base64-encoded
        const data = Buffer.from(JSON.stringify(serializedStorage)).toString(
          "base64"
        );

        setUrl(`data://text/json;base64,${data}`);
        setHash(storageHash);
      }
    })();
  }, [pcds, setUrl, subscriptions, user]);

  return url ? (
    <Link to={url} download={`zupass-${hash}.json`}>
      <NewButton className="w-full" onClick={showToast}>
        Export
      </NewButton>
    </Link>
  ) : null;
}

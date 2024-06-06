import {
  ChakraProvider,
  ColorModeScript,
  GlobalStyle,
  theme as chakraTheme,
  extendBaseTheme
} from "@chakra-ui/react";
import React from "react";
import { createRoot } from "react-dom/client";
import { CheckinListPage } from "./pages/CheckinList";

const { Button, Modal, Table, Input } = chakraTheme.components;

const theme = extendBaseTheme({
  components: {
    Button,
    Modal,
    Table,
    Input
  }
});

function App(): JSX.Element {
  return (
    <React.StrictMode>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <GlobalStyle />
        <CheckinListPage />
      </ChakraProvider>
    </React.StrictMode>
  );
}

const root = createRoot(
  document.querySelector("#root") as unknown as HTMLDivElement
);
root.render(<App />);

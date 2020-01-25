import * as React from "react";
import "./styles.css";
import { AppBar, Toolbar, CssBaseline } from "@material-ui/core";
import { Main } from "./components/Main";

export default function App() {
  return (
    <React.Fragment>
      <CssBaseline />
      <React.Fragment>
        <AppBar position="fixed">
          <Toolbar>
            <h2>WordPress SSG Converter</h2>
          </Toolbar>
        </AppBar>
        <Toolbar />
        <Main />
      </React.Fragment>
    </React.Fragment>
  );
}

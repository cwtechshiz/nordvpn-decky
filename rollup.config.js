import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

export default defineConfig({
  input: "src/index.tsx",
  output: {
    file: "dist/index.js",
    globals: {
      react: "SP_REACT",
      "react-dom": "SP_REACTDOM",
      "decky-frontend-lib": "DFL",
    },
    format: "iife",
    exports: "default",
  },
  external: ["react", "react-dom", "decky-frontend-lib"],
  plugins: [
    commonjs(),
    nodeResolve(),
    typescript(),
    json(),
    replace({
      preventAssignment: false,
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
  ],
});

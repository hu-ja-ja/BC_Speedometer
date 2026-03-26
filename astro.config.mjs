import { defineConfig } from "astro/config";
import solid from "@astrojs/solid-js";

const [ownerFromRepo, repoFromRepo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
const GITHUB_OWNER = process.env.GITHUB_OWNER ?? ownerFromRepo ?? "hu-ja-ja";
const GITHUB_REPO = process.env.GITHUB_REPO ?? repoFromRepo ?? "BC_Speedometer";

const SITE_URL = process.env.SITE_URL ?? `https://${GITHUB_OWNER}.github.io`;
const BASE_PATH = normalizeBasePath(process.env.BASE_PATH ?? GITHUB_REPO);

function normalizeBasePath(value) {
  if (value === "/") {
    return "/";
  }

  const trimmed = value.replace(/^\/+|\/+$/g, "");
  return `/${trimmed}/`;
}

export default defineConfig({
  integrations: [solid()],
  output: "static",
  site: SITE_URL,
  base: BASE_PATH
});

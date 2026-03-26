import { For } from "solid-js";
import { Toast, toaster } from "@kobalte/core/toast";
import { Check, Rocket, ArrowRight, Layers, Blocks, Paintbrush, ExternalLink } from "lucide-solid";
import "./template-showcase.css";

const featureBlocks = [
  {
    title: "Astro Integration",
    text: "Fast static site generation coupled with intuitive file-based routing.",
    icon: Layers
  },
  {
    title: "SolidJS Components",
    text: "Build purely reactive, high-performance UI components embedded seamlessly.",
    icon: Blocks
  },
  {
    title: "Global CSS Tokens",
    text: "Simply manage layout colors and sizes using straightforward CSS variables.",
    icon: Paintbrush
  }
];

const nextSteps = [
  {
    file: "src/pages/index.astro",
    desc: "Start editing the layout and content of this page."
  },
  {
    file: "src/layouts/BaseLayout.astro",
    desc: "Update the overall HTML document head and structural tags."
  },
  {
    file: "src/styles/global.css",
    desc: "Customize the global color palette and standard font settings."
  }
];

const packageLinks = [
  { name: "Astro", url: "https://astro.build/", note: "Static site framework" },
  { name: "Solid", url: "https://www.solidjs.com/", note: "Reactive UI library" },
  { name: "Kobalte", url: "https://kobalte.dev/", note: "Headless UI primitives" },
  { name: "Lucide", url: "https://lucide.dev/", note: "Open-source icon system" },
  { name: "Tabler Icons", url: "https://tabler-icons.io/", note: "Additional icon set" }
];

const docsLinks = [
  { title: "Astro Docs", url: "https://docs.astro.build/" },
  { title: "Solid Docs", url: "https://docs.solidjs.com/" },
  { title: "Kobalte Docs", url: "https://kobalte.dev/docs/core/overview/introduction" }
];

const packageLicenses = [
  { name: "Astro", license: "MIT", url: "https://github.com/withastro/astro/blob/main/LICENSE" },
  { name: "Solid", license: "MIT", url: "https://github.com/solidjs/solid/blob/main/LICENSE" },
  { name: "Kobalte", license: "MIT", url: "https://github.com/kobaltedev/kobalte/blob/main/LICENSE.md" },
  { name: "Lucide", license: "ISC", url: "https://github.com/lucide-icons/lucide/blob/main/LICENSE" },
  { name: "Tabler Icons", license: "MIT", url: "https://github.com/tabler/tabler-icons/blob/master/LICENSE" }
];

export default function TemplateShowcase() {
  const showKobalteToast = () => {
    toaster.show((toastProps) => (
      <Toast toastId={toastProps.toastId} duration={3000} class="toast">
        <Toast.Title class="toast-title">
          <Check size={14} class="toast-icon"/>
          Kobalte works! Ready for your project.
        </Toast.Title>
      </Toast>
    ));
  };

  return (
    <div class="template-container">
      <header class="hero-block">
        <div class="title-bar">
          <h1 class="title">
            <Rocket size={24} class="title-icon" />
            Solid + Astro Template
          </h1>
          <button class="action-btn" type="button" onClick={showKobalteToast}>
            Test Toast
          </button>
        </div>
        <p class="description max-w-text">
          A minimalist starting point for your web projects. This setup provides a simple architecture, keeping configuration bloat away so you can focus immediately on building your user interface.
        </p>
      </header>

      <div class="main-split">
        <section class="panel-section">
          <h2 class="section-title">Core Features</h2>
          <div class="card-grid">
            <For each={featureBlocks}>
              {(feature) => (
                <div class="feature-card">
                  <div class="feature-icon-wrap">
                    <feature.icon size={18} />
                  </div>
                  <div class="feature-content">
                    <strong class="feature-title">{feature.title}</strong>
                    <p class="feature-text">{feature.text}</p>
                  </div>
                </div>
              )}
            </For>
          </div>
        </section>

        <section class="panel-section">
          <h2 class="section-title">Next Steps</h2>
          <ul class="step-list">
            <For each={nextSteps}>
              {(step) => (
                <li class="step-item">
                  <ArrowRight size={14} class="step-arrow" />
                  <div class="step-details">
                    <code class="step-file">{step.file}</code>
                    <span class="step-desc">{step.desc}</span>
                  </div>
                </li>
              )}
            </For>
          </ul>
        </section>
      </div>

      <section class="panel-section resource-panel">
        <h2 class="section-title">Resources</h2>
        <div class="resource-grid">
          <article class="resource-block">
            <h3 class="resource-title">Used Packages</h3>
            <ul class="resource-list">
              <For each={packageLinks}>
                {(pkg) => (
                  <li class="resource-item">
                    <strong class="resource-item-title">{pkg.name}</strong>
                    <span class="resource-note">{pkg.note}</span>
                    <a class="resource-link" href={pkg.url} target="_blank" rel="noreferrer">
                      <span>Official Site</span>
                      <ExternalLink size={12} />
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </article>

          <article class="resource-block">
            <h3 class="resource-title">Docs</h3>
            <ul class="resource-list">
              <For each={docsLinks}>
                {(doc) => (
                  <li class="resource-item">
                    <strong class="resource-item-title">{doc.title}</strong>
                    <a class="resource-link" href={doc.url} target="_blank" rel="noreferrer">
                      <span>Open Docs</span>
                      <ExternalLink size={12} />
                    </a>
                  </li>
                )}
              </For>
            </ul>
          </article>

          <article class="resource-block">
            <h3 class="resource-title">OSS Licenses</h3>
            <ul class="resource-list">
              <For each={packageLicenses}>
                {(item) => (
                  <li class="resource-item">
                    <strong class="resource-item-title">{item.name}</strong>
                    <span class="resource-note">{item.license}</span>
                    <a class="resource-link" href={item.url} target="_blank" rel="noreferrer">
                      <span>View License Text</span>
                      <ExternalLink size={12} />
                    </a>
                  </li>
                )}
              </For>
            </ul>
            <p class="license-line">License types are taken from installed package metadata.</p>
          </article>
        </div>
      </section>

      <Toast.Region class="toast-region">
        <Toast.List class="toast-list" />
      </Toast.Region>
    </div>
  );
}

---
name: solid-kobalte-pages
description: "Astro + SolidJS template page creation workflow using Kobalte primitives, lucide-solid icons, Tabler brand icons, IBM Plex Sans, and existing template UI style inheritance. Use for new page implementation, section redesign, or feature page scaffolding in this repository."
argument-hint: "作成したいページの目的、必要セクション、インタラクション要件を指定"
---

# Solid Kobalte Pages

このスキルは、このリポジトリの既存テンプレート規約を維持したまま、Astro + SolidJSページを実装するための手順を提供する。

## When To Use
- 新しいページを追加するとき
- 既存ページをテンプレート様式に沿って再設計するとき
- Kobalteのprimitive UIを使ってアクセシブルなUIを組み立てるとき
- アイコン方針を統一したいとき（基本Lucide、企業ロゴ系のみTabler）
- フォントとトークン運用を既存規約に合わせたいとき

## Required Conventions
- Framework: Astro + SolidJS（インタラクティブ領域はSolid islandで実装）
- Theme: 既存テンプレートのダークトーンを固定で継承（ライトテーマは対象外）
- UI primitives: インタラクティブ要素は可能な限り `@kobalte/core` へ移譲
- Icons:
	- 原則: `lucide-solid` で統一
	- 例外: Lucideに適切なアイコンがない場合のみ `@tabler/icons-solidjs` を利用
- Typography: `@fontsource/ibm-plex-sans` を本文UIで使用
- Style inheritance:
	- `src/styles/global.css` のデザイントークンを再利用
	- 既存のボーダー主体・角丸なし・高コントラストなダークトーンを維持

## Workflow
1. 要件整理
- ページ目的、主要セクション、必要インタラクションを箇条書き化。
- 静的要素と動的要素を分離する。

2. 構成決定（AstroとSolidの責務分離）
- Astro: ページ構造、レイアウト、SEOメタ。
- Solid: インタラクティブ部品（トグル、トースト、ドロップダウン、状態遷移）。

3. UI骨格作成（テンプレート継承）
- まず既存のセクション構造に合わせて枠組みを置く。
- `var(--bg)`, `var(--surface)`, `var(--line)`, `var(--ink)`, `var(--muted)`, `var(--accent)` を優先使用。
- 角丸を増やしすぎない（既存様式はシャープな境界表現）。

4. Kobalte primitives導入
- インタラクティブ要素はまずKobalteで実装可否を確認する。
- Kobalteに該当primitiveがない場合のみ、`@zag-js` または自実装を選ぶ。
- キーボード操作、フォーカス可視性、ARIA属性が保たれる構成にする。

5. アイコン適用
- アクションや状態アイコンはLucideで統一する。
- Lucideに該当がない場合のみ、Tablerを代替として利用する。
- 装飾だけのアイコンを増やさず、意味を持つ箇所に限定する。

6. タイポグラフィ整合
- ベースフォントをIBM Plex Sans前提で調整。
- 見出し・本文・補助テキストのサイズ差を明確化し、可読性を優先。

7. 検証
- `pnpm check`
- `pnpm lint`
- 必要なら `pnpm build`

## Decision Points
- インタラクションが必要か:
	- 必要: Solidコンポーネント化
	- 不要: Astroテンプレート内で静的に実装
- UIが複雑か:
	- 複雑: まずKobalte primitiveを検討
	- Kobalteに機能がない: zagjsまたは自実装
	- 単純: セマンティックHTML + 既存CSS
- アイコン種別:
	- 基本: Lucide
	- Lucideに該当なし: Tabler

## Completion Checks
- Astro + SolidJSの責務分離が崩れていない
- ダークトーン固定のテンプレート継承が維持されている
- Kobalteを必要箇所で使用し、操作性とアクセシビリティを維持している
- Kobalteで不足する機能のみzagjsまたは自実装にしている
- アイコン選定ルール（Lucide統一優先、欠落時のみTabler）を満たしている
- フォントがIBM Plex Sans基準で統一されている
- 既存のテンプレートUIトーン（色、境界、間隔、情報密度）と整合している
- 型チェック/リンター/ビルドで致命的エラーがない

## Example Prompts
- 「このテンプレート規約に沿って、価格表ページを作成して」
- 「KobalteのDialogとTabsを使って、機能紹介ページを実装して」
- 「Lucide中心でダッシュボード風の設定ページを作り、企業ロゴだけTablerで出して」
- 「既存のTemplateShowcaseと同じUIトーンで、FAQページへ置き換えて」

## Output Expectations
- 変更ファイルの一覧
- 実装したコンポーネント境界（Astro/ Solid）の説明
- Kobalte, Lucide, Tablerの採用理由
- 実行した検証コマンドと結果要約
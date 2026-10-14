/**
 * notion-enhancer: line numbers
 * (c) 2020 CloudHill <rl.cloudhill@gmail.com> (https://github.com/CloudHill)
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

function LineNumbers({ decorationStyle = "None" }) {
  const { html } = globalThis.__enhancerApi,
    decorations = {
      Border: "pr-[16px] border-r-([2px] [color:var(--theme--bg-hover)])",
      Background: `pr-[4px] before:(absolute block h-full
        w-[calc(100%-24px)] rounded-[4px] right-0 content-empty
        bg-[var(--theme--bg-hover)] z-[-1])`,
    };
  return html`<div
    class="notion-enhancer--line-numbers text-([85%]
    [var(--theme--fg-secondary)] right) font-[var(--font--code)]
    overflow-hidden select-none relative flex-grow ${decorations[decorationStyle] || ""}"
    aria-hidden="true"
  ></div>`;
}

export default async (api, db) => {
  const { html } = api,
    decorationStyle = await db.get("decorationStyle"),
    numberSingleLines = await db.get("numberSingleLines"),
    states = new Map();
  let frame;
  const applyStyles = ($element, styles) => {
    for (const key in styles) {
      if ($element.style[key] !== styles[key]) $element.style[key] = styles[key];
    }
  };
  const schedule = () => {
    frame ??= requestAnimationFrame(() => {
      frame = undefined;
      numberLines();
    });
  };
  const resizeObserver = new ResizeObserver(schedule);
  const numberLines = () => {
    for (const [$code, state] of states) {
      if ($code.isConnected) continue;
      state.numbers.remove();
      resizeObserver.unobserve($code);
      states.delete($code);
    }
    for (const $block of document.querySelectorAll(".notion-code-block")) {
      const $code = $block.querySelector(
        ".notranslate[contenteditable], [contenteditable='true'], .notranslate",
      );
      if (!$code) continue;
      let state = states.get($code);
      if (!state) {
        state = { numbers: html`<${LineNumbers} ...${{ decorationStyle }} />` };
        states.set($code, state);
        resizeObserver.observe($code);
      }
      const lines = $code.innerText.split(/\r\n|\r|\n/);
      if (lines.length > 1 && lines.at(-1) === "") lines.pop();
      const count = Math.max(lines.length, 1),
        visible = numberSingleLines || count > 1,
        digits = String(count).length,
        width = visible
          ? `calc(100% - ${decorationStyle === "Border" ? 50 : 32}px - ${digits}ch)` : "";
      applyStyles($code.parentElement, { justifyContent: "flex-end" });
      applyStyles($code, {
        minWidth: width, maxWidth: width,
        paddingLeft: visible && decorationStyle === "Border" ? "16px" : "32px",
      });
      const computed = getComputedStyle($code),
        lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.5,
        wrapping = computed.whiteSpace.includes("wrap") || computed.wordBreak === "break-all",
        contentWidth = $code.clientWidth - (parseFloat(computed.paddingLeft) || 0)
          - (parseFloat(computed.paddingRight) || 0),
        signature = JSON.stringify([lines, visible, contentWidth, computed.font,
          lineHeight, wrapping, computed.wordBreak, computed.overflowWrap,
          computed.letterSpacing, computed.tabSize, computed.paddingTop]);
      if (!$code.parentElement.contains(state.numbers)) $code.before(state.numbers);
      if (state.signature === signature) continue;
      state.signature = signature;

      // A mirror measures tabs, CJK and proportional fonts without changing
      // the editable content or relying on a character-count approximation.
      const $measure = document.createElement("div");
      Object.assign($measure.style, {
        position: "fixed", left: "-100000px", top: "0", visibility: "hidden",
        width: `${Math.max(contentWidth, 1)}px`, padding: "0", border: "0",
        font: computed.font, lineHeight: `${lineHeight}px`,
        whiteSpace: wrapping ? "pre-wrap" : "pre", wordBreak: computed.wordBreak,
        overflowWrap: computed.overflowWrap, letterSpacing: computed.letterSpacing,
        tabSize: computed.tabSize,
      });
      if (wrapping) document.body.append($measure);
      let totalHeight = 0;
      const rows = lines.map((line, index) => {
        $measure.textContent = line || "\u200b";
        const height = wrapping ? Math.max(lineHeight, $measure.getBoundingClientRect().height) : lineHeight;
        const $row = state.numbers.children[index] || document.createElement("p");
        if ($row.textContent !== String(index + 1)) $row.textContent = String(index + 1);
        applyStyles($row, { height: `${height}px`, margin: "0", lineHeight: `${lineHeight}px` });
        totalHeight += height;
        return $row;
      });
      $measure.remove();
      while (state.numbers.children.length > rows.length) state.numbers.lastElementChild.remove();
      for (const $row of rows) {
        if ($row.parentElement !== state.numbers) state.numbers.append($row);
      }
      applyStyles(state.numbers, {
        display: visible ? "" : "none", height: `${totalHeight}px`,
        marginTop: `${parseFloat(computed.paddingTop) || 0}px`, lineHeight: `${lineHeight}px`,
      });
    }
  };
  const observer = new MutationObserver((mutations) => {
    if (mutations.some((mutation) => {
      const $target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if ($target?.closest(".notion-enhancer--line-numbers")) return false;
      if (mutation.type === "childList") {
        return [...mutation.addedNodes, ...mutation.removedNodes].some(($node) =>
          $node.nodeType === Node.TEXT_NODE || $node.matches?.(".notion-code-block") ||
          $node.querySelector?.(".notion-code-block") ||
          ($target?.closest(".notion-code-block") && !$node.matches?.(".notion-enhancer--line-numbers")),
        );
      }
      return Boolean($target?.closest(".notion-code-block"));
    })) schedule();
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ["style", "class"] });
  window.addEventListener("resize", schedule);
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener("loadingdone", schedule);
  numberLines();
};

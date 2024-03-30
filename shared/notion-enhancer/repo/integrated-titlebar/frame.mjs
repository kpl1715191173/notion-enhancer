/**
 * notion-enhancer: integrated titlebar
 * (c) 2021 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

'use strict';

import { createWindowButtons } from './buttons.mjs';

export default async function (api, db) {
  const { web, registry } = api,
    tilingMode = await db.get(['tiling']),
    dragareaHeight = await db.get(['dragarea_height']),
    tabsEnabled = await registry.enabled('e1692c29-475e-437b-b7ff-3eee872e1a42');

  if (tabsEnabled && !tilingMode) {
    const windowActionsSelector = '#window-actions';
    await web.whenReady([windowActionsSelector]);

    const $topbarActions = document.querySelector(windowActionsSelector),
      $windowButtons = await createWindowButtons(api, db);
    web.render($topbarActions, $windowButtons);
  } else {
    const dragareaSelector = '[style*="-webkit-app-region: drag;"]';
    await web.whenReady([dragareaSelector]);

    const dragarea = document.querySelector(dragareaSelector);
    dragarea.style.top = '2px';
    dragarea.style.height = tilingMode ? '0' : `${dragareaHeight}px`;

    document.getElementById('notion').addEventListener('ipc-message', (event) => {
      switch (event.channel) {
        case 'notion-enhancer:sidebar-width':
          dragarea.style.left = event.args[0];
          break;
        case 'notion-enhancer:panel-width':
          dragarea.style.right = event.args[0];
          break;
      }
    });
  }
}

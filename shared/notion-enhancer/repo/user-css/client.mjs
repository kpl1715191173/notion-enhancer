/**
 * notion-enhancer: user-css
 * (c) 2024 Alan Lee <1715191173@qq.com>
 * (https://notion-enhancer.github.io/) under the MIT license
 */

'use strict';

export default async function ({notion, web}, db) {
	const pageId = await db.get(['pageId'])
	if (pageId) {
		const codeList = (await notion.get(pageId)).content
		processArray(codeList);
	}

	async function processArray(codeList) {
		for (const codeId of codeList) {
			let blockCtx = await notion.get(codeId);
			if (blockCtx.type === 'code') {
				let css = blockCtx.properties.title[0][0]

				let style = document.createElement('style');
				if (style.styleSheet) {
					style.styleSheet.cssText = css;
				} else {
					style.appendChild(document.createTextNode(css));
				}
				style.dataset.description = blockCtx.properties.caption ? blockCtx.properties.caption[0] : ''

        /* Style must be inserted into the body */
				document.body.appendChild(style);
			} else {
				return
			}
		}
	}

}

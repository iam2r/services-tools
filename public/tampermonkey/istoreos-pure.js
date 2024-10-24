// ==UserScript==
// @name         iStoreOS Pure
// @namespace    http://tampermonkey.net/
// @version      2024-08-25
// @description  try to take over the world!
// @author       You
// @match        *://*/*cgi-bin/luci*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=0.2
// @grant        none
// ==/UserScript==
(function () {
	'use strict';

	const i18n = {
		lang: document.querySelector('html').getAttribute('lang'),
		messages: {
			'zh-cn': {
				linkease: '易有云',
				files: '文件管理',
			},
			en: {
				linkease: 'linkease',
				files: 'Files',
			},
		},
		t(key) {
			return (i18n.messages[i18n.lang] || i18n.messages.en)[key];
		},
	};

	// 隐藏匹配元素的函数
	function actionsElements(
		parent = document,
		selectors = [
			//登录页
			...[
				//页脚隐藏
				{
					selector: '.login-container footer',
				},
			],
			//主页面
			...[
				//隐藏头部istore官网
				{
					selector: 'a[href^="https://www.istoreos.com"]',
				},
				//页脚隐藏
				{
					selector: '#maincontent footer > *',
				},
				//隐藏quickstart面板问号引导
				{
					selector: '.app-container_title >span > a',
				},
				//隐藏状态-概览页的易有云
				{
					selector: '#linkease_status',
				},
			],
			//存储服务
			...[
				//改存储服务模块的易有云到文件管理器
				{
					selector: '.app-container_nas-menu button',
					filterFun: (element) => {
						return element.innerText.toLowerCase().includes('易有云');
					},
					action: (element) => {
						element.innerText = i18n.t('files');
					},
				},
				//改存储服务模块的易有云到文件管理器
				{
					selector: '.app-container_linkease .linkease-item_value a',
					filterFun: (element) => {
						return element.innerText.includes('http');
					},
					action: (element) => {
						element.setAttribute('href', '/cgi-bin/luci/admin/services/linkease/file');
						element.innerText = i18n.t('files');
					},
				},
				//改存储服务模块 快速配置弹窗中的易有云为文件管理
				{
					selector: '#actioner',
					filterFun: (element) => {
						return element.querySelector('.title')?.innerText?.includes('NAS');
					},
					action: (element) => {
						actionsElements(element, [
							{
								selector: 'option',
								filterFun: (element) => {
									return element.innerText.includes('易有云');
								},
								action: (element) => {
									element.innerText = i18n.t('files');
								},
							},
						]);
					},
				},
				//改存储服务模块 快速配置弹窗中的易有云配置引导到文件管理
				{
					selector: '.info a',
					filterFun: (element) => {
						return element.innerText.includes('8897');
					},
					action: (element) => {
						element.setAttribute('href', '/cgi-bin/luci/admin/services/linkease/file');
						element.innerText = i18n.t('files');
					},
				},
				//隐藏存储服务模块的易有云推广
				{
					selector: '.app-container_linkease >div',
					filterFun: (element) => {
						return element.querySelector('a')?.getAttribute('href').includes('linkease');
					},
				},
			],
			//下载服务
			...[
				//隐藏下载服务模块的易有云下载推广
				{
					selector: '.use-url_app',
					filterFun: (element) => {
						return element.innerText.toLowerCase().includes('易有云');
					},
				},
			],
			//远程域名
			...[
				//隐藏远程域名模块的DDNSTO
				{
					selector: '.app-container_domain .domain-item',
					filterFun: (element) => {
						return element.innerText.includes('DDNSTO');
					},
				},
				//改远程域名模块 快速配置打开时选中阿里云
				{
					selector: '.app-container_title',
					filterFun: (element) => {
						return element.innerText.includes('远程域名');
					},
					action: (element) => {
						const configButton = element?.querySelector('.app-container_configure');
						if (!configButton || configButton._click) return;
						configButton._click = () => {
							actionsElements(document, [
								{
									selector: '.actioner-container',
									filterFun: (element) => {
										return element.querySelector('.actioner-container_header').innerText.includes('域名配置向导');
									},
									action: (element) => {
										actionsElements(element, [
											{
												selector: '.actioner-container_body .label-item',
												filterFun: (element) => {
													return element.innerText.includes('阿里云');
												},
												action: (element) => {
													element.querySelector('label').click();
												},
											},
										]);
									},
								},
							]);
						};

						configButton.addEventListener('click', configButton._click);
					},
				},
				//隐藏远程域名模块 快速配置弹窗中的DDNSTO
				{
					selector: '.actioner-container',
					filterFun: (element) => {
						return element.querySelector('.actioner-container_header').innerText.includes('域名配置向导');
					},
					action: (element) => {
						actionsElements(element, [
							{
								selector: '.actioner-container_body .label-item',
								filterFun: (element) => {
									return element.innerText.includes('DDNSTO');
								},
							},
						]);
					},
				},
			],
			//侧边栏
			...[
				//改侧边易有云文件管理为文件管理
				{
					selector: '.slide-menu li a',
					filterFun: (element) => {
						return element.innerText?.toLowerCase().includes(i18n.t('linkease'));
					},
					action: (element) => {
						element.setAttribute('href', '/cgi-bin/luci/admin/services/linkease/file');
						element.innerText = i18n.t('files');
					},
				},
			],

			//修改易有云本地文件管理
			...[
				//隐藏易有云文件管理网盘入口
				{
					selector: '.el-scrollbar__view .menu-item',
					filterFun: (element) => {
						return element.innerText?.includes('开启网盘');
					},
					action: (element) => {
						element.style.display = 'none';
						if (window.location.href.includes('/cgi-bin/luci/admin/services/linkease/file')) {
							document.querySelector('title').innerText = i18n.t('files');
						}
					},
				},
			],

			//iStore 列表过滤
			...[
				{
					selector: '.containers .app-container',
					filterFun: (element) => {
						return ['ddnsto', 'ddns.to', i18n.t('linkease')].some((key) =>
							element.querySelector('.app-name')?.innerText?.toLowerCase()?.includes(key)
						);
					},
				},
			],
		]
	) {
		selectors.forEach(
			({
				selector,
				filterFun = () => true,
				action = (element) => {
					element.style.display = 'none';
				},
			}) => {
				if (parent && parent.querySelectorAll) {
					const elements = [...(parent.querySelectorAll(selector) || [])].filter(filterFun);

					elements.forEach(action);
				}
			}
		);
	}

	// 监听 DOM 变化
	const observer = new MutationObserver((mutations) => {
		mutations.forEach((mutation) => {
			actionsElements();
		});
	});

	// 开始监听
	observer.observe(document.body, { childList: true, subtree: true });

	actionsElements();
})();

// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

const REPO_URL = 'https://github.com/devpparikh/paywright';

// https://astro.build/config
export default defineConfig({
	site: 'https://docs.paywright.dev-parikh.com',
	integrations: [
		starlight({
			title: 'Paywright',
			description:
				'A production-ready Stripe payment microservice you scaffold in one command.',
			social: [{ icon: 'github', label: 'GitHub', href: REPO_URL }],
			editLink: { baseUrl: `${REPO_URL}/edit/main/packages/docs/` },
			plugins: [
				// Generated from the service's own spec — the same file the SDK
				// is generated from, so the reference can't drift from the API
				starlightOpenAPI([
					{
						base: 'api',
						schema: '../template/openapi.json',
						sidebar: { label: 'API reference', operations: { badges: true } },
					},
				]),
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Introduction', slug: 'start/introduction' },
						{ label: 'Quick start', slug: 'start/quick-start' },
						{ label: 'Configuration', slug: 'start/configuration' },
					],
				},
				{
					label: 'Guides',
					items: [
						{ label: 'One-time payments', slug: 'guides/payments' },
						{ label: 'Subscriptions', slug: 'guides/subscriptions' },
						{ label: 'Webhooks', slug: 'guides/webhooks' },
						{ label: 'Testing payments', slug: 'guides/testing' },
					],
				},
				{
					label: 'Client SDKs',
					items: [
						{ label: 'TypeScript SDK', slug: 'sdk/typescript' },
						{ label: 'Other languages', slug: 'sdk/other-languages' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'Architecture', slug: 'concepts/architecture' },
						{ label: 'Operations', slug: 'concepts/operations' },
					],
				},
				{
					label: 'Reference',
					items: [{ label: 'CLI', slug: 'reference/cli' }],
				},
				...openAPISidebarGroups,
			],
		}),
	],
});

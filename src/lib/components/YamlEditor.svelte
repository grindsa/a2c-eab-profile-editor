<script lang="ts">
	import { onMount } from 'svelte';
	import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from '@codemirror/view';
	import { EditorState } from '@codemirror/state';
	import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
	import { yaml } from '@codemirror/lang-yaml';
	import {
		bracketMatching,
		foldGutter,
		foldKeymap,
		indentOnInput,
		syntaxHighlighting,
		defaultHighlightStyle
	} from '@codemirror/language';
	import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';

	interface Props {
		value: string;
		onchange: (value: string) => void;
	}
	let { value, onchange }: Props = $props();

	let host = $state<HTMLDivElement | null>(null);
	let view: EditorView | null = null;
	let lastEmitted = '';

	const theme = EditorView.theme({
		'&': {
			height: '100%',
			fontSize: '0.8rem',
			backgroundColor: '#fff',
			color: '#1a242b'
		},
		'.cm-content': {
			fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
			caretColor: '#0f766e'
		},
		'.cm-gutters': {
			backgroundColor: '#f2f6f7',
			color: '#5a6b75',
			border: 'none',
			borderRight: '1px solid #cfd8dd'
		},
		'.cm-activeLine': { backgroundColor: 'rgba(15, 118, 110, 0.06)' },
		'.cm-activeLineGutter': { backgroundColor: 'rgba(15, 118, 110, 0.08)' },
		'&.cm-focused .cm-cursor': { borderLeftColor: '#0f766e' },
		'&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
			backgroundColor: 'rgba(15, 118, 110, 0.18)'
		}
	});

	onMount(() => {
		if (!host) return;

		lastEmitted = value;
		view = new EditorView({
			parent: host,
			state: EditorState.create({
				doc: value,
				extensions: [
					lineNumbers(),
					highlightActiveLine(),
					drawSelection(),
					history(),
					foldGutter(),
					indentOnInput(),
					bracketMatching(),
					highlightSelectionMatches(),
					syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
					yaml(),
					theme,
					EditorView.lineWrapping,
					keymap.of([
						indentWithTab,
						...defaultKeymap,
						...historyKeymap,
						...foldKeymap,
						...searchKeymap
					]),
					EditorView.updateListener.of((update) => {
						if (!update.docChanged) return;
						const text = update.state.doc.toString();
						lastEmitted = text;
						onchange(text);
					})
				]
			})
		});

		return () => {
			view?.destroy();
			view = null;
		};
	});

	$effect(() => {
		if (!view) return;
		const current = view.state.doc.toString();
		if (value !== current && value !== lastEmitted) {
			view.dispatch({
				changes: { from: 0, to: current.length, insert: value }
			});
			lastEmitted = value;
		}
	});
</script>

<div class="yaml-editor" bind:this={host} data-testid="yaml-editor"></div>

<style>
	.yaml-editor {
		flex: 1;
		min-height: 20rem;
		border: 1px solid var(--line);
		border-radius: 0.35rem;
		overflow: hidden;
		background: #fff;
	}
	.yaml-editor :global(.cm-editor) {
		height: 100%;
	}
	.yaml-editor :global(.cm-scroller) {
		overflow: auto;
	}
</style>

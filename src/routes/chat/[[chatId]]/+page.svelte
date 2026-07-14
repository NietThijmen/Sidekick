<script lang="ts">
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import ModelSelector from '$lib/components/ModelSelector.svelte';
	import AgentSelector from '$lib/components/AgentSelector.svelte';
	import LabLogo from '$lib/components/LabLogo.svelte';
	import {
		Loader2,
		Send,
		User,
		Bot,
		Plus,
		Trash2,
		Menu,
		X,
		Wrench,
		Sparkles
	} from '@lucide/svelte';
	import { onMount, tick } from 'svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data } = $props();

	let inputValue = $state('');
	let isLoading = $state(false);
	let isSidebarOpen = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let inputRef: HTMLInputElement | null = $state(null);
	let chatToDelete: string | null = $state(null);
	let optimisticMessages = $state<
		Array<{
			id: string;
			chatId: string;
			role: 'user';
			content: string;
			createdAt: Date;
			toolCalls: null;
			usage: null;
		}>
	>([]);
	let streamingContent = $state('');
	let streamingReasoning = $state('');
	let streamingMessageId = $state<string | null>(null);
	let submitError = $state('');
	let reasoningOpen = $state(true);

	let messages = $derived([...data.messages, ...optimisticMessages]);
	let currentAgent = $derived(data.currentChat.agent ?? null);

	let effectiveModel = $derived(currentAgent?.model ?? data.currentChat.model);

	let effectiveModelInfo = $derived(data.models.find((m) => m.id === effectiveModel));

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		const content = inputValue.trim();
		if (!content || isLoading) return;

		inputValue = '';
		isLoading = true;
		submitError = '';

		const userMessage = {
			id: crypto.randomUUID(),
			chatId: data.currentChat.id,
			role: 'user' as const,
			content,
			createdAt: new Date(),
			toolCalls: null,
			usage: null
		};
		optimisticMessages = [...optimisticMessages, userMessage];
		tick().then(scrollToBottom);

		try {
			const response = await fetch('/api/chat/stream', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId: data.currentChat.id, content })
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(text || 'Failed to send message');
			}

			streamingMessageId = crypto.randomUUID();
			streamingContent = '';
			streamingReasoning = '';
			reasoningOpen = true;

			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const decoder = new TextDecoder();
			let buffer = '';
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				const lines = buffer.split('\n');
				buffer = lines.pop() || '';

				for (const line of lines) {
					if (!line.trim()) continue;
					try {
						const parsed = JSON.parse(line);
						if (parsed.type === 'reasoning') {
							streamingReasoning += parsed.content;
						} else if (parsed.type === 'content') {
							streamingContent += parsed.content;
							reasoningOpen = false;
						}
					} catch {
						// skip non-JSON lines
					}
				}
				tick().then(scrollToBottom);
			}
		} catch (err) {
			submitError = err instanceof Error ? err.message : 'Failed to send message';
			inputValue = content;
			optimisticMessages = optimisticMessages.filter((m) => m.id !== userMessage.id);
		} finally {
			streamingMessageId = null;
			streamingContent = '';
			streamingReasoning = '';
			isLoading = false;
			await invalidateAll();
			optimisticMessages = [];
			tick().then(() => {
				scrollToBottom();
				inputRef?.focus();
			});
		}
	}

	function getInitials(name: string) {
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function formatChatDate(date: Date | number) {
		const d = new Date(date);
		const now = new Date();
		const isToday = d.toDateString() === now.toDateString();
		if (isToday) {
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		}
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}

	async function selectChat(chatId: string) {
		isSidebarOpen = false;
		await goto(resolve(`/chat/${chatId}`), { replaceState: false });
	}

	async function changeModel(modelId: string) {
		await fetch('?/setModel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new SvelteURLSearchParams({ chatId: data.currentChat.id, model: modelId })
		});
		await invalidateAll();
	}

	async function changeAgent(agentId: string) {
		await fetch('?/setAgent', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new SvelteURLSearchParams({
				chatId: data.currentChat.id,
				agentId
			})
		});
		await invalidateAll();
	}

	async function removeAgent() {
		await fetch('?/setAgent', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new SvelteURLSearchParams({
				chatId: data.currentChat.id,
				agentId: ''
			})
		});
		await invalidateAll();
	}

	async function createNewChatWithAgent(agentId: string) {
		isSidebarOpen = false;
		const formData = new SvelteURLSearchParams();
		formData.set('title', 'New chat');
		if (agentId) {
			formData.set('agentId', agentId);
		}
		const res = await fetch('?/newChat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: formData
		});
		if (res.redirected) {
			window.location.href = res.url;
			return;
		}
		const result = await res.json();
		if (result?.type === 'redirect' && result?.location) {
			await goto(result.location);
		}
	}

	async function createNewChat() {
		await createNewChatWithAgent('');
	}

	onMount(() => {
		scrollToBottom();
		inputRef?.focus();
	});

	$effect(() => {
		if (messages.length >= 0) {
			tick().then(scrollToBottom);
		}
	});
</script>

<svelte:head>
	<title>Sidekick</title>
</svelte:head>

<div class="flex h-screen flex-col bg-background">
	<header class="flex items-center justify-between border-b px-4 py-3">
		<div class="flex items-center gap-2">
			<Button
				variant="ghost"
				size="icon"
				class="lg:hidden"
				onclick={() => (isSidebarOpen = !isSidebarOpen)}
				aria-label="Toggle sidebar"
			>
				{#if isSidebarOpen}
					<X class="size-5" />
				{:else}
					<Menu class="size-5" />
				{/if}
			</Button>
			<Bot class="size-6 hidden sm:block" />
			<h1 class="text-lg font-semibold">Sidekick</h1>

			<div class="hidden lg:flex items-center gap-2">
				<AgentSelector
					agents={data.agents}
					value={currentAgent?.id ?? ''}
					onSelect={changeAgent}
					onRemove={removeAgent}
				/>

				<ModelSelector
					models={data.models}
					value={effectiveModel}
					onSelect={changeModel}
					inheritFromAgent={currentAgent}
				/>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<Button
				variant="ghost"
				size="sm"
				href={resolve('/profile')}
				class="flex items-center gap-2 px-2 text-sm text-muted-foreground hover:text-foreground"
			>
				{#if data.user.image}
					<img src={data.user.image} alt="" class="size-8 rounded-full object-cover" />
				{:else}
					<div
						class="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground"
					>
						{getInitials(data.user.name)}
					</div>
				{/if}
				<span class="hidden sm:inline">{data.user.name}</span>
			</Button>
		</div>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside
			class="absolute inset-y-0 left-0 z-20 w-full transform border-r bg-card transition-transform lg:static lg:w-72 lg:translate-x-0 {isSidebarOpen
				? 'translate-x-0'
				: '-translate-x-full'}"
			style="top: 57px; height: calc(100% - 57px);"
		>
			<div class="flex h-full flex-col">
				<div class="border-b p-3">
					<div class="flex flex-col gap-2">
						<button
							type="button"
							onclick={createNewChat}
							class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
						>
							<Plus class="size-4" />
							New chat
						</button>
					</div>
					<div class="mt-3 flex flex-col gap-2 lg:hidden">
						<AgentSelector
							agents={data.agents}
							value={currentAgent?.id ?? ''}
							onSelect={changeAgent}
							onRemove={removeAgent}
						/>
						<ModelSelector
							models={data.models}
							value={effectiveModel}
							onSelect={changeModel}
							inheritFromAgent={currentAgent}
						/>
					</div>
				</div>

				<div class="flex-1 overflow-y-auto p-2">
					{#if data.chats.length === 0}
						<p class="p-3 text-sm text-muted-foreground">No conversations yet.</p>
					{:else}
						<div class="flex flex-col gap-1">
							{#each data.chats as chatItem (chatItem.id)}
								<div class="group flex items-center gap-1">
									<button
										type="button"
										onclick={() => selectChat(chatItem.id)}
										class="flex flex-1 flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition-colors {data
											.currentChat.id === chatItem.id
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-muted'}"
									>
										<span class="truncate w-full">{chatItem.title}</span>
										<div class="flex w-full items-center gap-2">
											<span
												class="shrink-0 text-xs opacity-70 {data.currentChat.id === chatItem.id
													? 'text-primary-foreground'
													: 'text-muted-foreground'}"
											>
												{formatChatDate(chatItem.updatedAt)}
											</span>
											{#if chatItem.agent}
												<span
													class="ml-auto truncate text-[10px] opacity-60 {data.currentChat.id ===
													chatItem.id
														? 'text-primary-foreground'
														: 'text-muted-foreground'}"
												>
													<Sparkles class="mr-0.5 inline size-2.5" />
													{chatItem.agent.name}
												</span>
											{/if}
										</div>
									</button>

									{#if chatToDelete === chatItem.id}
										<form method="post" action="?/deleteChat" class="flex items-center gap-1">
											<input type="hidden" name="chatId" value={chatItem.id} />
											<Button
												type="submit"
												variant="ghost"
												size="icon-xs"
												class="size-7 text-destructive hover:text-destructive"
												aria-label="Confirm delete"
											>
												<Trash2 class="size-3.5" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon-xs"
												class="size-7"
												onclick={() => (chatToDelete = null)}
												aria-label="Cancel delete"
											>
												<X class="size-3.5" />
											</Button>
										</form>
									{:else}
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											class="size-7 opacity-0 group-hover:opacity-100 {data.currentChat.id ===
											chatItem.id
												? 'hover:bg-primary-foreground/20'
												: 'hover:bg-muted'}"
											onclick={() => (chatToDelete = chatItem.id)}
											aria-label="Delete chat"
										>
											<Trash2 class="size-3.5" />
										</Button>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</aside>

		<!-- Overlay for mobile sidebar -->
		{#if isSidebarOpen}
			<button
				type="button"
				class="absolute inset-0 z-10 bg-black/20 lg:hidden"
				style="top: 57px;"
				onclick={() => (isSidebarOpen = false)}
				aria-label="Close sidebar"
			></button>
		{/if}

		<!-- Main chat area -->
		<main class="flex flex-1 flex-col overflow-hidden">
			<div bind:this={messagesContainer} class="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
				{#if messages.length === 0 && !streamingMessageId}
					<div class="flex flex-1 flex-col items-center justify-center text-center">
						<Bot class="mb-4 size-12 text-muted-foreground" />
						<h2 class="text-xl font-semibold">How can I help you today?</h2>
						<p class="mt-2 max-w-sm text-sm text-muted-foreground">
							Send a message to start a conversation. Your chat history is saved automatically.
						</p>
					</div>
				{:else}
					{#each messages as message (message.id)}
						<div class="flex w-full" class:justify-end={message.role === 'user'}>
							<Card
								class="max-w-[85%] sm:max-w-[75%] {message.role === 'user'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted'}"
							>
								<CardContent class="flex gap-3 p-3">
									<div
										class="flex size-8 shrink-0 items-center justify-center rounded-full {message.role ===
										'user'
											? 'bg-primary-foreground/20 text-primary-foreground'
											: 'bg-background text-foreground'}"
									>
										{#if message.role === 'user' && data.user.image}
											<img src={data.user.image} alt="" class="size-8 rounded-full object-cover" />
										{:else if message.role === 'user'}
											<User class="size-4" />
										{:else}
											<LabLogo lab={effectiveModelInfo?.lab ?? ''} class="size-4" />
										{/if}
									</div>
									<div class="min-w-0 space-y-1">
										<MarkdownRenderer
											content={message.content}
											class={message.role === 'user'
												? 'text-primary-foreground'
												: 'text-foreground'}
										/>
										<span class="text-xs opacity-70">
											{new Date(message.createdAt).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</span>
										{#if message.role === 'assistant' && (message.reasoning || message.toolCalls?.length || message.usage)}
											<details class="pt-2" open={false}>
												<summary
													class="flex cursor-pointer list-none items-center gap-1 text-xs font-medium opacity-80"
												>
													{#if message.reasoning}
														<span>Reasoning{message.toolCalls?.length ? ' + ' : ''}</span>
													{/if}
													{#if message.toolCalls?.length}
														<Wrench class="size-3" />
														<span
															>{message.toolCalls.length} tool call{message.toolCalls.length === 1
																? ''
																: 's'}</span
														>
													{/if}
													{#if message.usage?.totalCost}
														<span class="ml-auto text-[10px] opacity-60"
															>${message.usage.totalCost.toFixed(5)}</span
														>
													{/if}
												</summary>
												<div class="mt-2 space-y-2">
													{#if message.reasoning}
														<div
															class="rounded-lg border bg-background/50 p-2 text-xs text-muted-foreground"
														>
															{message.reasoning}
														</div>
													{/if}
													{#each message.toolCalls as toolCall (toolCall.id)}
														<div class="rounded-lg border bg-background/50 p-2 text-xs">
															<p class="font-semibold">{toolCall.toolName}</p>
															<p class="mt-1 text-muted-foreground">
																args: {JSON.stringify(toolCall.args)}
															</p>
															{#if toolCall.result}
																<p class="mt-1 text-muted-foreground">
																	result: {JSON.stringify(toolCall.result)}
																</p>
															{/if}
														</div>
													{/each}
												</div>
											</details>
										{/if}
									</div>
								</CardContent>
							</Card>
						</div>
					{/each}
				{/if}
				{#if streamingMessageId}
					<div class="flex w-full justify-start">
						<Card class="max-w-[85%] bg-muted sm:max-w-[75%]">
							<CardContent class="flex gap-3 p-3">
								<div
									class="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
								>
									<LabLogo lab={effectiveModelInfo?.lab ?? ''} class="size-4" />
								</div>
								<div class="min-w-0 space-y-1">
									{#if streamingReasoning}
										<details open={reasoningOpen}>
											<summary
												class="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
											>
												Reasoning
											</summary>
											<div
												class="mt-1 rounded-md border bg-background/50 p-2 text-xs text-muted-foreground"
											>
												{streamingReasoning}
											</div>
										</details>
									{/if}
									{#if streamingContent}
										<MarkdownRenderer content={streamingContent} class="text-foreground" />
										{#if isLoading}
											<span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
												<Loader2 class="size-3 animate-spin" />
												Thinking...
											</span>
										{/if}
									{:else if !streamingReasoning}
										<div class="flex items-center gap-1 py-1 text-sm text-muted-foreground">
											<span>Thinking</span>
											<span class="thinking-dot">.</span>
											<span class="thinking-dot" style="animation-delay: 0.1s">.</span>
											<span class="thinking-dot" style="animation-delay: 0.2s">.</span>
										</div>
									{/if}
								</div>
							</CardContent>
						</Card>
					</div>
				{/if}
			</div>

			<div class="border-t p-4">
				{#if data.activeSkills.length > 0}
					<div class="mb-2 flex flex-wrap items-center gap-2">
						<span class="text-xs text-muted-foreground">Skills active:</span>
						{#each data.activeSkills as skill (skill.id)}
							<span
								class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
							>
								{skill.name}
							</span>
						{/each}
					</div>
				{/if}

				<form onsubmit={handleSubmit} class="flex items-end gap-2">
					<Input
						bind:ref={inputRef}
						name="content"
						placeholder="Type your message..."
						bind:value={inputValue}
						disabled={isLoading}
						class="min-h-[44px] flex-1 resize-none"
						autocomplete="off"
						onkeydown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								e.currentTarget.form?.requestSubmit();
							}
						}}
					/>
					<Button type="submit" disabled={isLoading || !inputValue.trim()} size="icon">
						{#if isLoading}
							<Loader2 class="size-4 animate-spin" />
						{:else}
							<Send class="size-4" />
						{/if}
					</Button>
				</form>
				{#if submitError}
					<p class="mt-2 text-sm text-destructive">{submitError}</p>
				{/if}
			</div>
		</main>
	</div>
</div>

<style>
	.thinking-dot {
		display: inline-block;
		animation: thinking-bounce 0.8s infinite;
	}

	.thinking-dot:first-child {
		animation-delay: 0s;
	}

	@keyframes thinking-bounce {
		0%,
		100% {
			opacity: 0.2;
			transform: translateY(0);
		}
		50% {
			opacity: 1;
			transform: translateY(-2px);
		}
	}
</style>

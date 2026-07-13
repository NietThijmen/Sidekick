<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent } from '$lib/components/ui/card';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import LabLogo from '$lib/components/LabLogo.svelte';
	import { Loader2, LogOut, Send, User, Bot, Plus, Trash2, Menu, X, Wrench, ChevronDown } from '@lucide/svelte';
	import { onMount, tick } from 'svelte';

	let { data, form } = $props();

	let inputValue = $state('');
	let isLoading = $state(false);
	let isSidebarOpen = $state(false);
	let messagesContainer: HTMLDivElement | undefined = $state();
	let inputRef: HTMLInputElement | null = $state(null);
	let chatToDelete: string | null = $state(null);
	let showModelSelector = $state(false);
	let modelSearch = $state('');
	let searchRef: HTMLInputElement | null = $state(null);

	let currentModelInfo = $derived(
		data.models.find((m) => m.id === data.currentChat.model)
	);

	let filteredModels = $derived(
		modelSearch
			? data.models.filter((m) =>
					m.name.toLowerCase().includes(modelSearch.toLowerCase())
				)
			: data.models
	);

	let filteredModelsByLab = $derived(
		filteredModels.reduce(
			(groups, model) => {
				(groups[model.lab] ??= []).push(model);
				return groups;
			},
			{} as Record<string, typeof data.models>
		)
	);

	function getTierLabel(tier: number): string {
		return '$'.repeat(tier);
	}

	function scrollToBottom() {
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
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

	async function handleLogout() {
		await fetch('/api/auth/sign-out', { method: 'POST' });
		window.location.href = '/login';
	}

	async function selectChat(chatId: string) {
		isSidebarOpen = false;
		await goto(resolve(`/?chat=${chatId}`), { replaceState: false });
	}

	async function changeModel(modelId: string) {
		showModelSelector = false;
		await fetch('?/setModel', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ chatId: data.currentChat.id, model: modelId })
		});
		await invalidateAll();
	}

	onMount(() => {
		scrollToBottom();
		inputRef?.focus();
	});

	$effect(() => {
		if (data.messages.length >= 0) {
			tick().then(scrollToBottom);
		}
	});

	$effect(() => {
		if (showModelSelector) {
			modelSearch = '';
			tick().then(() => searchRef?.focus());
		}
	});
</script>

<svelte:head>
	<title>AI Assistant</title>
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
			<h1 class="text-lg font-semibold">AI Assistant</h1>
			<div class="relative">
				<button
					type="button"
					onclick={() => (showModelSelector = !showModelSelector)}
					class="flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
				>
					<span>{currentModelInfo?.name ?? data.currentChat.model}</span>
					{#if currentModelInfo}
						<span class="tabular-nums">{getTierLabel(currentModelInfo.tier)}</span>
					{/if}
					<ChevronDown class="size-3" />
				</button>

				{#if showModelSelector}
					<div
						class="absolute left-0 top-full z-50 mt-1 w-80 rounded-lg border bg-popover shadow-lg"
					>
						<div class="border-b p-2">
							<input
								bind:this={searchRef}
								type="text"
								placeholder="Search models..."
								bind:value={modelSearch}
								class="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
								onclick={(e) => e.stopPropagation()}
							/>
						</div>
						<div class="max-h-72 overflow-y-auto p-1">
							{#each Object.entries(filteredModelsByLab) as [lab, labModels]}
								<div class="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
									{lab}
								</div>
								{#each labModels as model (model.id)}
									<button
										type="button"
										onclick={() => changeModel(model.id)}
										class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted {model.id ===
										data.currentChat.model
											? 'bg-muted font-medium'
											: ''}"
									>
										<span class="truncate">{model.name}</span>
										<span class="shrink-0 tabular-nums text-muted-foreground">{getTierLabel(model.tier)}</span>
									</button>
								{/each}
							{/each}
							{#if Object.keys(filteredModelsByLab).length === 0}
								<p class="px-3 py-4 text-center text-xs text-muted-foreground">No models match your search.</p>
							{/if}
						</div>
					</div>

					<button
						type="button"
						class="fixed inset-0 z-40 cursor-default"
						onclick={() => (showModelSelector = false)}
						aria-label="Close model selector"
					></button>
				{/if}
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
			<Button variant="ghost" size="icon" onclick={handleLogout} aria-label="Log out">
				<LogOut class="size-4" />
			</Button>
		</div>
	</header>

	<div class="flex flex-1 overflow-hidden">
		<!-- Sidebar -->
		<aside
			class="absolute inset-y-0 left-0 z-20 w-72 transform border-r bg-card transition-transform lg:static lg:translate-x-0 {isSidebarOpen
				? 'translate-x-0'
				: '-translate-x-full'}"
			style="top: 57px; height: calc(100% - 57px);"
		>
			<div class="flex h-full flex-col">
				<div class="border-b p-3">
					<form method="post" action="?/newChat" class="w-full">
						<input type="hidden" name="title" value="New chat" />
						<Button type="submit" variant="outline" class="w-full justify-start gap-2">
							<Plus class="size-4" />
							New chat
						</Button>
					</form>
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
										class="flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors {data
											.currentChat.id === chatItem.id
											? 'bg-primary text-primary-foreground'
											: 'hover:bg-muted'}"
									>
										<span class="truncate">{chatItem.title}</span>
										<span
											class="shrink-0 text-xs opacity-70 {data.currentChat.id === chatItem.id
												? 'text-primary-foreground'
												: 'text-muted-foreground'}"
										>
											{formatChatDate(chatItem.updatedAt)}
										</span>
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
				{#if data.messages.length === 0}
					<div class="flex flex-1 flex-col items-center justify-center text-center">
						<Bot class="mb-4 size-12 text-muted-foreground" />
						<h2 class="text-xl font-semibold">How can I help you today?</h2>
						<p class="mt-2 max-w-sm text-sm text-muted-foreground">
							Send a message to start a conversation. Your chat history is saved automatically.
						</p>
					</div>
				{:else}
					{#each data.messages as message (message.id)}
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
											<LabLogo lab={currentModelInfo?.lab ?? ''} class="size-4" />
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
										{#if message.role === 'assistant' && (message.toolCalls?.length || message.usage)}
											<details class="pt-2">
												<summary
													class="flex cursor-pointer list-none items-center gap-1 text-xs font-medium opacity-80"
												>
													<Wrench class="size-3" />
													{#if message.toolCalls?.length}
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
				{#if isLoading}
					<div class="flex w-full justify-start">
						<Card class="max-w-[85%] bg-muted sm:max-w-[75%]">
							<CardContent class="flex items-center gap-3 p-3">
								<div
									class="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-foreground"
								>
									<LabLogo lab={currentModelInfo?.lab ?? ''} class="size-4" />
								</div>
								<Loader2 class="size-4 animate-spin" />
								<span class="text-sm text-muted-foreground">Thinking... tools may be used</span>
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

				<form
					method="post"
					action="?/sendMessage"
					use:enhance={() => {
						isLoading = true;
						const userMessage = inputValue;
						inputValue = '';
						return async ({ result, update }) => {
							if (result.type === 'failure') {
								inputValue = userMessage;
							}
							await invalidateAll();
							await update();
							isLoading = false;
							tick().then(() => {
								scrollToBottom();
								inputRef?.focus();
							});
						};
					}}
					class="flex items-end gap-2"
				>
					<input type="hidden" name="chatId" value={data.currentChat.id} />
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
				{#if form?.error}
					<p class="mt-2 text-sm text-destructive">{form.error}</p>
				{/if}
			</div>
		</main>
	</div>
</div>

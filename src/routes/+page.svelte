<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/chat', { replaceState: true });
	});
</script>

<svelte:head>
	<title>AI Assistant</title>
</svelte:head>

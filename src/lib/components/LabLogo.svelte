<script lang="ts">
	let { lab = '', class: className = '' }: { lab?: string; class?: string } = $props();
</script>

<img src="https://models.dev/logos/{lab.toLowerCase()}.svg" alt={lab} class={className} />

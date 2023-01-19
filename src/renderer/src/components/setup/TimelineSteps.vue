<script lang="ts">

export interface Step {
    name: string
    path: string
    order: number
}

export const TimelineSteps: Step[] = [
    { name: 'Hello 👋', path: 'landing', order: 0 },
    { name: 'Profile 👤', path: 'profile', order: 1 },
    { name: 'TCP 🔗', path: 'tcp', order: 2 },
    { name: 'Vision Mixer 📼', path: 'vision-mixer', order: 3 },
    { name: 'OBS 🔗', path: 'obs', order: 4 },

    { name: 'Audio device 🎧', path: 'audio', order: 5 },
    { name: 'Container 🗃️', path: 'container', order: 6 },
    { name: 'Mapping 🗺️', path: 'mapping', order: 7 },
    { name: 'Auto cam settings 🔧', path: 'settings', order: 8 },
    { name: 'Summary 🏁', path: 'summary', order: 9 }
]

export default {
    TimelineSteps: TimelineSteps
}

</script>

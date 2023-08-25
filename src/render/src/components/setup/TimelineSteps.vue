<script lang="ts">

export interface Step {
    name: string
    path: string
    order: number
    edit?: boolean
}

export const TimelineSteps: Step[] = [
    { name: 'Hello 👋', path: 'landing', order: 0 },
    { name: 'Profile 👤', path: 'profile', order: 1 },
    { name: 'TCP 🔗', path: 'tcp', order: 2, edit: true },
    { name: 'Video Mixer 📼', path: 'video-mixer', order: 3 },
    { name: 'OBS 🔗', path: 'obs', order: 4, edit: true },

    { name: 'Audio device 🎧', path: 'audio', order: 5, edit: true },
    { name: 'Container 🗃️', path: 'container', order: 6, edit: true },
    { name: 'Mapping 🗺️', path: 'mapping', order: 7, edit: true },
    { name: 'Auto cam settings 🔧', path: 'settings', order: 8, edit: true },
    { name: 'Summary 🏁', path: 'summary', order: 9 }
]

export default {
    TimelineSteps: TimelineSteps
}

</script>

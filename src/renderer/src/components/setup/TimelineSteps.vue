<script lang="ts">

export interface Step {
    name: string
    path: string
    order: number
    edit?: boolean
}

export const TimelineSteps: Step[] = [
    { name: 'Hello π', path: 'landing', order: 0 },
    { name: 'Profile π€', path: 'profile', order: 1 },
    { name: 'TCP π', path: 'tcp', order: 2, edit: true },
    { name: 'Video Mixer πΌ', path: 'video-mixer', order: 3 },
    { name: 'OBS π', path: 'obs', order: 4, edit: true },

    { name: 'Audio device π§', path: 'audio', order: 5, edit: true },
    { name: 'Container ποΈ', path: 'container', order: 6 },
    { name: 'Mapping πΊοΈ', path: 'mapping', order: 7, edit: true },
    { name: 'Auto cam settings π§', path: 'settings', order: 8, edit: true },
    { name: 'Summary π', path: 'summary', order: 9 }
]

export default {
    TimelineSteps: TimelineSteps
}

</script>

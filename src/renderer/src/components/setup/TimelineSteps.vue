<script lang="ts">

export interface Step {
    name: string
    path: string
    order: number
}

export const TimelineSteps: Step[] = [
    { name: 'Audio device', path: 'audio', order: 0 },
    { name: 'Container', path: 'container', order: 1 },
    { name: 'Mapping', path: 'mapping', order: 2 },
    { name: 'Auto cam settings', path: 'settings', order: 3 },
    { name: 'Summary', path: 'summary', order: 4 },
]

export default {
    TimelineSteps: TimelineSteps
}

</script>

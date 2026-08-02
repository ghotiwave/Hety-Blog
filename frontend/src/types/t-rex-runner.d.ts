declare module 't-rex-runner/dist/runner.js' {
  interface RunnerInstance {
    distanceMeter?: { digits?: string[] }
    distanceRan: number
    crashed: boolean
    destroy?: () => void
  }

  const initRunner: (selector: string) => RunnerInstance
  export default initRunner
}

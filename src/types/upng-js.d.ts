declare module 'upng-js' {
  interface UPNG {
    encode(frames: ArrayBuffer[], width: number, height: number, colors: number, delays?: number[]): ArrayBuffer
  }
  const UPNG: UPNG
  export default UPNG
}

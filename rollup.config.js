import typeScript from 'rollup-plugin-typescript2';

const getPlugins = (options) => [
    typeScript({
        tsconfig: "tsconfig.browser.json",
        tsconfigOverride: { compilerOptions: { "target": options.target } }
    }),
]

export default [
    {
        input: 'example/service.ts',
        output: [{ file: 'example/dist/service.js', format: 'iife' }],
        plugins: getPlugins({ target: "esnext" })
    },
    {
        input: 'example/service.test.ts',
        output: [{ file: 'example/dist/service.test.js', format: 'iife' }],
        plugins: getPlugins({ target: "esnext" })
    }
]

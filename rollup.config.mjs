import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/index.ts',
    output: [
        {
            file: 'dist/umd/index.js',
            format: 'umd',
            name: 'Http',
            sourcemap: true,
            exports: 'named',
        },
        {
            file: 'dist/umd/index.min.js',
            format: 'umd',
            name: 'Http',
            sourcemap: true,
            plugins: [terser()],
            exports: 'named',
        },
    ],
    plugins: [
        typescript({
            useTsconfigDeclarationDir: true,
            tsconfig: 'tsconfig.umd.json',
        }),
        nodeResolve(),
    ],
};

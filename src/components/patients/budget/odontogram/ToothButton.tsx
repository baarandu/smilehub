import { cn } from '@/lib/utils';
import { getToothType, isUpperTooth, isRightSide } from './odontogramData';
import {
    getLateralPaths,
    getOcclusalPaths,
    LATERAL_VIEWBOX,
    OCCLUSAL_VIEWBOX,
} from './toothPathsSimple';

interface ToothButtonProps {
    tooth: number;
    isSelected: boolean;
    onClick: () => void;
}

const STROKE = '#c4c9d0';
const STROKE_SEL = '#3b82f6';
const DETAIL = '#d4d8de';
const DETAIL_SEL = '#93c5fd';

export function ToothButton({ tooth, isSelected, onClick }: ToothButtonProps) {
    const unit = tooth % 10;
    const upper = isUpperTooth(tooth);
    const right = isRightSide(tooth);
    const type = getToothType(tooth);

    const lateral = getLateralPaths(unit, upper);
    const occlusal = getOcclusalPaths(type);

    const mirrorX = right ? 'scale(-1,1)' : '';
    const flipY = !upper ? 'scale(1,-1)' : '';
    const label = tooth.toString();

    const s = isSelected ? STROKE_SEL : STROKE;
    const d = isSelected ? DETAIL_SEL : DETAIL;
    const fill = isSelected ? '#dbeafe' : 'white';

    const lateralSvg = (
        <svg width={32} height={60} viewBox={LATERAL_VIEWBOX} className="shrink-0">
            <g transform={`translate(22,29) ${mirrorX} ${flipY} translate(-22,-29)`}>
                <path d={lateral.outline} fill={fill} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
            </g>
        </svg>
    );

    const occlusalSvg = (
        <svg width={24} height={24} viewBox={OCCLUSAL_VIEWBOX} className="shrink-0">
            <path d={occlusal.outline} fill={fill} stroke={s} strokeWidth={1.2} strokeLinejoin="round" />
            <path d={occlusal.detail} fill="none" stroke={d} strokeWidth={0.7} />
        </svg>
    );

    const numberSpan = (
        <span
            className={cn(
                'text-xs leading-none select-none font-medium',
                isSelected ? 'text-blue-500 font-bold' : 'text-slate-400'
            )}
        >
            {label}
        </span>
    );

    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex flex-col items-center gap-[2px] rounded px-[1px] py-1 transition-colors cursor-pointer',
                'hover:bg-slate-50',
                isSelected && 'bg-blue-50/50 hover:bg-blue-50'
            )}
            title={`Dente ${label}`}
        >
            {upper ? (
                <>
                    {numberSpan}
                    {lateralSvg}
                    {occlusalSvg}
                </>
            ) : (
                <>
                    {occlusalSvg}
                    {lateralSvg}
                    {numberSpan}
                </>
            )}
        </button>
    );
}

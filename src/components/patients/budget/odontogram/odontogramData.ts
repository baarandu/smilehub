export type ToothType = 'molar' | 'premolar' | 'canine' | 'incisor';

export type Quadrant = {
    teeth: number[];
    position: 'upper-right' | 'upper-left' | 'lower-left' | 'lower-right';
};

// Permanent teeth (FDI notation)
export const PERMANENT_QUADRANTS: Quadrant[] = [
    { teeth: [18, 17, 16, 15, 14, 13, 12, 11], position: 'upper-right' },
    { teeth: [21, 22, 23, 24, 25, 26, 27, 28], position: 'upper-left' },
    { teeth: [48, 47, 46, 45, 44, 43, 42, 41], position: 'lower-right' },
    { teeth: [31, 32, 33, 34, 35, 36, 37, 38], position: 'lower-left' },
];

// Deciduous teeth (FDI notation)
export const DECIDUOUS_QUADRANTS: Quadrant[] = [
    { teeth: [55, 54, 53, 52, 51], position: 'upper-right' },
    { teeth: [61, 62, 63, 64, 65], position: 'upper-left' },
    { teeth: [85, 84, 83, 82, 81], position: 'lower-right' },
    { teeth: [71, 72, 73, 74, 75], position: 'lower-left' },
];

export function getToothType(toothNumber: number): ToothType {
    const unit = toothNumber % 10;
    if (unit >= 6) return 'molar';
    if (unit >= 4) return 'premolar';
    if (unit === 3) return 'canine';
    return 'incisor';
}

export function isUpperTooth(toothNumber: number): boolean {
    const quadrant = Math.floor(toothNumber / 10);
    return quadrant === 1 || quadrant === 2 || quadrant === 5 || quadrant === 6;
}

export function isRightSide(toothNumber: number): boolean {
    const quadrant = Math.floor(toothNumber / 10);
    return quadrant === 1 || quadrant === 4 || quadrant === 5 || quadrant === 8;
}

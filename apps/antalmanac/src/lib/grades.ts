import { getSelectedGEs } from '$components/RightPane/CoursePane/SearchForm/constants';
import type { CourseSearchParams } from '$components/RightPane/RightPaneStore';
import { trpc } from '$lib/api/trpc';
import { trpcReact } from '$lib/api/trpc';
import type { AggregateGrades, AggregateGradesByOffering } from '@packages/anteater-api/types';
import type { GE } from '@packages/anteater-api/types';

type TrpcUtils = ReturnType<typeof trpcReact.useUtils>;

export type GradesBulkInput = {
    department?: string;
    courseNumber?: string;
    instructor?: string;
    ge?: GE;
    sectionCode?: string;
};

const prefetchedScopes = new Set<string>();

function bulkScopeKey(input: GradesBulkInput): string {
    return [
        input.department ?? '',
        input.ge ?? '',
        input.courseNumber ?? '',
        input.instructor ?? '',
        input.sectionCode ?? '',
    ].join('|');
}

export function clearPrefetchedGradesScopes(): void {
    prefetchedScopes.clear();
}

function normalizeBulkInput(searchData: CourseSearchParams): GradesBulkInput | null {
    const department = searchData.deptValue !== 'ALL' ? searchData.deptValue : undefined;
    const selectedGEs = getSelectedGEs(searchData.ge ?? '');
    const ge = selectedGEs.length === 1 ? (selectedGEs[0] as GE) : undefined;
    const courseNumber = searchData.courseNumber || undefined;
    const instructor = searchData.instructor || undefined;
    const sectionCode = searchData.sectionCode || undefined;

    if (!department && !ge && !instructor && !sectionCode) {
        return null;
    }

    return { department, ge, courseNumber, instructor, sectionCode };
}

export function getGradesBulkInputs(
    formData: CourseSearchParams,
    multiSearchData: CourseSearchParams[]
): GradesBulkInput[] {
    if (multiSearchData.length > 0) {
        const seen = new Set<string>();
        const inputs: GradesBulkInput[] = [];

        for (const course of multiSearchData) {
            const input = normalizeBulkInput(course);
            if (!input) {
                continue;
            }

            const key = bulkScopeKey(input);
            if (seen.has(key)) {
                continue;
            }

            seen.add(key);
            inputs.push(input);
        }

        return inputs;
    }

    const selectedGEs = getSelectedGEs(formData.ge ?? '');
    const base = normalizeBulkInput(formData);

    if (selectedGEs.length > 1 && !base?.department) {
        return selectedGEs.map((ge) => ({ ge: ge as GE }));
    }

    return base ? [base] : [];
}

type OfferingRow = AggregateGradesByOffering[number];

function offeringToAggregateGrades(offering: OfferingRow): AggregateGrades {
    return {
        sectionList: [],
        gradeDistribution: {
            gradeACount: offering.gradeACount,
            gradeBCount: offering.gradeBCount,
            gradeCCount: offering.gradeCCount,
            gradeDCount: offering.gradeDCount,
            gradeFCount: offering.gradeFCount,
            gradePCount: offering.gradePCount,
            gradeNPCount: offering.gradeNPCount,
            gradeWCount: offering.gradeWCount,
            averageGPA: offering.averageGPA,
        },
    };
}

export function hydrateAggregateGradesCache(utils: TrpcUtils, offerings: AggregateGradesByOffering): void {
    for (const offering of offerings) {
        utils.grades.aggregateGrades.setData(
            {
                department: offering.department,
                courseNumber: offering.courseNumber,
                instructor: offering.instructor ?? '',
            },
            offeringToAggregateGrades(offering)
        );
    }
}

/**
 * Bulk-fetch grades for a search scope and populate the React Query cache used by aggregateGrades.
 * Call after WebSOC search succeeds so GPA cells read from cache instead of fanning out requests.
 */
export async function prefetchGradesByOffering(utils: TrpcUtils, input: GradesBulkInput): Promise<void> {
    const scopeKey = bulkScopeKey(input);
    if (prefetchedScopes.has(scopeKey)) {
        return;
    }

    const offerings = await trpc.grades.aggregateByOffering.mutate(input);
    if (!offerings) {
        throw new Error('prefetchGradesByOffering: Failed to query grades');
    }

    hydrateAggregateGradesCache(utils, offerings);
    prefetchedScopes.add(scopeKey);
}

export async function prefetchGradesForSearch(
    utils: TrpcUtils,
    formData: CourseSearchParams,
    multiSearchData: CourseSearchParams[]
): Promise<void> {
    const inputs = getGradesBulkInputs(formData, multiSearchData);
    await Promise.all(inputs.map((input) => prefetchGradesByOffering(utils, input)));
}

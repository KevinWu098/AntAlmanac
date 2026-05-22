import { TableBodyCellContainer } from '$components/RightPane/SectionTable/SectionTableBody/SectionTableBodyCells/TableBodyCellContainer';
import { GradesPopover } from '$components/RightPane/SectionTable/SectionTablePopover/GradesPopover';
import { useIsMobile } from '$hooks/useIsMobile';
import { trpcReact } from '$lib/api/trpc';
import { ButtonBase, Popover, useTheme } from '@mui/material';
import { useCallback, useMemo, useState } from 'react';

interface GpaCellProps {
    deptCode: string;
    courseNumber: string;
    instructors: string[];
}

export const GpaCell = ({ deptCode, courseNumber, instructors }: GpaCellProps) => {
    const isMobile = useIsMobile();
    const theme = useTheme();
    const [anchorEl, setAnchorEl] = useState<Element>();
    const utils = trpcReact.useUtils();

    const namedInstructors = useMemo(() => instructors.filter((i) => i !== 'STAFF'), [instructors]);

    const cachedMatch = useMemo(() => {
        for (const instructor of namedInstructors) {
            const data = utils.grades.aggregateGrades.getData({
                department: deptCode,
                courseNumber,
                instructor,
            });
            const averageGPA = data?.gradeDistribution?.averageGPA;
            if (averageGPA != null) {
                return {
                    instructor,
                    gpa: averageGPA.toFixed(2),
                };
            }
        }

        return {
            instructor: namedInstructors[0] ?? '',
            gpa: null as string | null,
        };
    }, [namedInstructors, deptCode, courseNumber, utils]);

    const { data: fetchedDistribution, isLoading } = trpcReact.grades.aggregateGrades.useQuery(
        { department: deptCode, courseNumber, instructor: cachedMatch.instructor },
        {
            enabled: namedInstructors.length > 0 && cachedMatch.gpa == null && Boolean(cachedMatch.instructor),
            select: (data) => data?.gradeDistribution ?? null,
            staleTime: Infinity,
        }
    );

    const gpa =
        cachedMatch.gpa ?? (fetchedDistribution?.averageGPA != null ? fetchedDistribution.averageGPA.toFixed(2) : '');

    const instructor = cachedMatch.instructor;

    const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl((current) => (current ? undefined : event.currentTarget));
    }, []);

    const hideDistribution = useCallback(() => {
        setAnchorEl(undefined);
    }, []);

    return (
        <TableBodyCellContainer>
            <ButtonBase
                sx={{
                    fontFamily: 'inherit',
                    fontSize: 'unset',
                    color: theme.palette.secondary.main,
                    fontWeight: 700,
                }}
                onClick={handleClick}
            >
                {isLoading ? null : gpa || 'GPA'}
            </ButtonBase>

            <Popover
                open={Boolean(anchorEl)}
                onClose={hideDistribution}
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <GradesPopover
                    deptCode={deptCode}
                    courseNumber={courseNumber}
                    instructor={instructor}
                    isMobile={isMobile}
                />
            </Popover>
        </TableBodyCellContainer>
    );
};

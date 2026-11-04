/**
 * @module
 * The notification codes the foundation owns, declared as `AppModule.notices` entries: each code
 * says how it reads and which screen it links to, and the shell collects them. Nothing outside this
 * file names these codes' wording or routes.
 */
import { TaskCategory, TaskKind } from '@/types/enums.ts';
import type { AppNotice, NoticeContext, NoticeTarget } from '@/kernel/registry';
import type { Notification } from '@types';

/**
 * The contract's variant for one code, so an entry's `params` are typed per code.
 */
type Of<TCode extends Notification['code']> = Extract<Notification, { code: TCode }>;

/**
 * Whether a server string is a value this client has a word for.
 *
 * @param values - The closed set the contract names.
 * @param value - What the server sent (a newer backend may send more).
 */
const isOneOf = (values: readonly string[], value: string | undefined): value is string =>
    value !== undefined && values.includes(value);

/**
 * The sentence of a task notice: what kind of task, and for a contact message its category. Kind
 * and category are closed codes the server sends; their words are this client's own, shared with
 * the task screens (`task-kind.*`, `task-category.*`).
 *
 * @param notice - The task notice.
 * @param context - Translate function.
 * @returns The finished text.
 */
const describeTask = (
    notice: Of<
        | 'notifications.staff.task-opened'
        | 'notifications.staff.task-overdue'
        | 'notifications.staff.task-assigned'
    >,
    { translate }: NoticeContext
): string => {
    const { code, params } = notice;
    const { kind } = params;
    // Only a contact task's opener can carry a category; the assigned notice never does.
    const category = 'category' in params ? params.category : undefined;
    const kindText = translate(
        isOneOf(Object.values(TaskKind), kind) ? `task-kind.${kind}` : 'task-kind.unknown'
    );
    const categoryText = translate(
        `task-category.${isOneOf(Object.values(TaskCategory), category) ? category : 'none'}`
    );
    return translate(code, {
        what: kind === TaskKind.contact ? `${kindText} · ${categoryText}` : kindText
    });
};

/**
 * Where a task notice links: the screen the server named for the work (`work`, opener and overdue
 * notices only), else the task's own page.
 *
 * @param notice - The task notice.
 */
const taskTarget = (
    notice: Of<
        | 'notifications.staff.task-opened'
        | 'notifications.staff.task-overdue'
        | 'notifications.staff.task-assigned'
    >
): NoticeTarget => {
    const work = 'work' in notice.params ? notice.params.work : undefined;
    return work ? { path: work } : { route: 'TaskDetail', params: { id: notice.params.taskId } };
};

/**
 * The task notice entry, shared by the three codes that differ only in their dictionary sentence.
 */
const taskNotice: AppNotice = { describe: describeTask, target: taskTarget };

/**
 * The foundation's five notice codes, by code.
 */
export const foundationNotices: Record<string, AppNotice> = {
    'notifications.staff.task-opened': taskNotice,
    'notifications.staff.task-overdue': taskNotice,
    'notifications.staff.task-assigned': taskNotice,
    'notifications.staff.webhook-disabled': {
        describe: (notice, { translate }) => translate(notice.code),
        target: (notice: Of<'notifications.staff.webhook-disabled'>) => ({
            route: 'WebhookTarget',
            params: { id: notice.params.subscriptionId }
        })
    },
    'notifications.staff.outbox-dead': {
        describe: (notice: Of<'notifications.staff.outbox-dead'>, { translate }) =>
            translate(notice.code, { event: notice.params.eventName }),
        // The parked event's first segment names the record; any other kind has no screen, and a
        // link to a guess would be worse than none.
        target: (notice: Of<'notifications.staff.outbox-dead'>) =>
            notice.params.eventName.split('.')[0] === 'user'
                ? { route: 'UserTarget', params: { id: notice.params.aggregateId } }
                : undefined
    }
};

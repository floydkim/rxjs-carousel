import {
    asapScheduler,
    asyncScheduler,
    observeOn,
    of,
    subscribeOn,
    tap,
} from "rxjs";
import { sleep } from "./utils";

/**
 * RxJS 스케쥴러 예제
 *
 * ReactiveX 공통적인 개념
 * 옵저버블 체인 동작에 멀티스레딩 혹은 동시성을 구현할 수 있는 스케쥴러를 제공한다.
 * 자바스크립트는 멀티스레드를 지원하지 않으므로, RxJS는 JS의 비동기 API들을 이용해 동시성을 구현한다.
 */
export const runRxJSSchedulerExample = async () => {
    // defaultScheduler();

    // await sleep(1000);

    subscribeOnAsync();

    await sleep(1000);

    // observeOnAsync();

    // await sleep(1000);

    // sequencialDepsOfObserveOn();
};

/**
 * 기본 스케쥴러 사용
 */
const defaultScheduler = () => {
    console.log("::: 기본 스케쥴링 (동기적) :::");

    const obs$ = of("A", "B", "C").pipe(
        tap((v) => console.log(`[${v}] 방출 데이터 처리 1`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 2`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 3`))
    );

    console.log("구독 전");
    const start = new Date().getTime();

    // subscribe 호출해 옵저버블이 데이터를 방출한다.
    //  - 데이터 방출과 pipe 연산이 모두 동기적으로 수행된다.
    //  - 구독 > 옵저버블 파이프 연산 > 옵저버가 값을 받아 호출되는 전체 과정이 끝난 후 종료 콘솔이 찍힌다.
    obs$.subscribe((v) => console.log("observer received", v));

    // 예제는 1ms 짜리지만, 경과시간 만큼 콜스택을 점유해 blocking 일어나므로 문제가 될 수 있다.
    console.log(`::: 종료 > ${new Date().getTime() - start}ms 경과 :::`);
};

/**
 * 옵저버블 구독시 사용할 스케쥴러 지정
 *  - 오퍼레이터: subscribeOn()
 *  - 스케쥴러: asyncScheduler
 */
const subscribeOnAsync = () => {
    console.log("::: subscribeOn(asyncScheduler) :::");

    const obs$ = of("A", "B", "C").pipe(
        tap((v) => console.log(`[${v}] 방출 데이터 처리 1`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 2`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 3`)),
        subscribeOn(asyncScheduler) // pipe 연산들 중 몇번째 순서로 호출되는지는 관계 없다.
    );

    console.log("구독 전");
    const start = new Date().getTime();

    // subscribe 호출하고 바로 다음 라인으로 넘어간다.
    obs$.subscribe((v) => console.log("observer received", v));

    // 생각해보자...
    // of로 생성한 옵저버블에 pipe 호출해서, 연산이 추가된 옵저버블이 obs$에 할당돼있다. (immutable이겠지)
    //  - pipe 연산 중 subscribeOn(asyncScheduler) 호출에 의해, subscribe 함수의 본문이 스케쥴러에 의해 실행될것
    //  - 지금은 asyncScheduler 사용해서, 마치 subscribe 함수를 setTimeout(.., 0)으로 감싼 동작이지 않을까.
    //
    // new Observable(function subscribe(subscriber) {
    //   // of, pipe 수행에 해당하는 동작.
    //   // .next("A" + pipe)
    //   // .next("B" + pipe)
    //   // .next("C" + pipe)
    // })
    // 스케쥴러가 없을땐 subscribe 호출시 위 함수가 동기 실행.
    // 지금은 subscribe 호출시 스케쥴러가 위 함수를 비동기 실행하므로 obs$.subscribe 호출 후 다음라인으로 넘어감.

    // https://github.com/ReactiveX/rxjs/blob/4ba8f9a5845bfa76154f7dcebc73d688b3416afb/src/internal/operators/subscribeOn.ts#L65
    // ```
    // export function subscribeOn...
    //     subscriber.add(scheduler.schedule(() => source.subscribe(subscriber), delay));
    // ```
    // 흠.. 스케쥴러에 기존 subscribe함수 실행을 넘기는 동작 같은데.. add의 콜백은 teardown 함수란다.
    // 근데 unsub했거나 아직 구독되지 않은 경우 teardown함수를 실행하게 돼있는거같은데.. 잘모르겠다..

    console.log(`${new Date().getTime() - start}ms 경과`);

    // 함수 내 동기적 실행을 block하지 않음.
    //  - '구독 전' 콘솔 직후 종료 콘솔이 찍힌다.
    //  - 즉 옵저버블의 파이프 연산 > 옵저버 호출은 동기적으로 일어난다.
};

/**
 *
 *  - 오퍼레이터: observeOn()
 *  - 스케쥴러: asyncScheduler
 *
 * Re-emits all notifications from source Observable with specified scheduler.
 * returns an Observable that emits the same notifications as the source Observable, but with provided scheduler.
 *
 * 옵저버블 내부 스케쥴러를 변경할 수 없지만 notification을 reschedule할 때 유용.
 *  ex. interval은 기본 스케쥴러를 사용하지만, observeOn 호출해 다른 스케쥴러를 사용하도록 reschedule 할 수 있다.
 *
 * notification을 비동기로..? 즉 next, error, complete 호출을 비동기로 하는것?
 * // TODO: of같은 옵저버블 생성함수와, pipe의 동작을 파악하면 더 잘 이해할 수 있을 것 같다.
 */
const observeOnAsync = () => {
    console.log("::: observeOn(asyncScheduler) :::");

    const obs$ = of("A", "B", "C").pipe(
        tap((v) => console.log(`[${v}] 방출 데이터 처리 1`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 2`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 3`)),
        observeOn(asyncScheduler)
        // subscribeOn(asyncScheduler)
    );

    console.log("구독 전");
    const start = new Date().getTime();

    obs$.subscribe((v) => console.log("observer received", v));

    console.log(`${new Date().getTime() - start}ms 경과`);
};

// TODO
const sequencialDepsOfObserveOn = () => {
    console.log("::: pipe 연산 중 스케쥴러 변경 :::");

    const obsFoo$ = of("A", "B", "C").pipe(
        // 기본 스케쥴러로 수행된다.
        tap((v) => console.log(`[${v}] 방출 데이터 처리 1`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 2`)),
        observeOn(asyncScheduler), // 이후 작업은 asyncScheduler로 수행된다.
        tap((v) => console.log(`[${v}] 방출 데이터 처리 3`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 4`)),
        observeOn(asapScheduler), // 이후 작업은 asapScheduler로 수행된다.
        tap((v) => console.log(`[${v}] 방출 데이터 처리 5`)),
        tap((v) => console.log(`[${v}] 방출 데이터 처리 6`))
    );

    obsFoo$.subscribe((v) => console.log("observer received", v));
};

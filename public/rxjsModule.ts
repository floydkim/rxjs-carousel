import {fromEvent, map, merge, mergeAll, mergeMap, switchMap, takeUntil, tap} from "rxjs";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const $view = document.getElementById("carousel")!; // null이 아님을 보장할 수 있음
console.log("$view", $view);

const $container = $view?.querySelector(".container");
console.log("$container", $container);

const PANEL_COUNT = $container?.querySelectorAll(".panel").length;
console.log("PANEL_COUNT", PANEL_COUNT);

const EVENTS = {
    start:  "mousedown",
    move:  "mousemove",
    end:  "mouseup",
};

// $view 에서 발생하는 이벤트 중 관심있는 이벤트들을 옵저버블로 만듦
export const makeObservable = () => {
    const start$ = fromEvent<MouseEvent>($view, EVENTS.start);
    const move$ = fromEvent<MouseEvent>($view, EVENTS.move);
    const end$ = fromEvent<MouseEvent>($view, EVENTS.end);

    /**
     * 드래그 이벤트 옵저버블
     *
     * ```
        const drag$ = start$.pipe(
            map(start => move$.pipe(takeUntil(end$))),
        );
     * ```
     *  - start$ 옵저버블의 스트림을 이용한다.
     *  - start$가 emit하는 모든 값을 move$ 옵저버블로 변환한다 (map)
     *  - 이 때 move$ 옵저버블(source)은 takeUntil에 의해, end$ 옵저버블(notifier)이 값을 방출하면 emit을 멈춘다
     *    - takeUntil은 source를 구독하고 미러링한다. 그러다 notifier가 값을 방출하면 미러링을 멈추고 complete을 호출한다.
     *
     * 여기까지만 구현하면 drag$는 move$ 옵저버블로 이뤄진 옵저버블이 된다. (중첩)
     * drag$ 옵저버블을 구독해 move$가 emit 하는 값을 얻을 수 있도록
     * `mergeAll`을 사용해 중첩된 옵저버블을 flatten한다.
     *
     * ```
        const drag$ = start$.pipe(map(..), mergeAll());
     * ```
     *
     * 이 때 map과 merge를 한번에 수행하는 `mergeMap` 오퍼레이터를 사용할 수 있다.
     * ```
        const drag$ = start$.pipe(
            mergeMap(start => move$.pipe(takeUntil(end$))),
        );
     * ```
     *
     * 내 생각엔 마우스가 해피케이스대로 동작한다면
     * mousedown 이벤트가 한번 더 발생하기 전에 end$의 값이 먼저 emit되므로
     * 기존 move$ 옵저버블이 종료된 다음 또다른 move$ 옵저버블이 발생할 것 같다.
     *
     * 책에서는 unhappy한 케이스를 대비하기 위해서일지, 일반적으로 적용해도 괜찮은 오퍼레이터여서 그런건지
     * `switchMap`을 사용하는 것이 최종 코드임.
     * (책설명: start$에서 데이터가 발생할 때마다 move$이 생성되기 때문에 기존 데이터를 자동으로 종료하기 위해서)
     */
    const drag$ = start$.pipe(
        switchMap(start => move$.pipe(takeUntil(end$))),
    );

    drag$.subscribe((e) => console.log("e", e));
};

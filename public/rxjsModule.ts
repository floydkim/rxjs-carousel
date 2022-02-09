import {first, fromEvent, map, merge, mergeAll, mergeMap, pluck, scan, share, startWith, switchMap, takeUntil, tap, withLatestFrom} from "rxjs";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const $view = document.getElementById("carousel")!; // null이 아님을 보장할 수 있음
console.log("$view", $view);

const $container = $view?.querySelector(".container") as HTMLElement;
console.log("$container", $container);

const PANEL_COUNT = $container?.querySelectorAll(".panel").length ?? 0;
console.log("PANEL_COUNT", PANEL_COUNT);

const EVENTS = {
    start:  "mousedown",
    move:  "mousemove",
    end:  "mouseup",
};

interface DragAndDropInterface {
    distance: number;
    size?: number
};

interface CarouselStateInterface {
    // 패널이 이동한 delta
    from: number;
    // 패널이 앞으로 이동할 좌표 정보 <- ?
    to: number;
    // 현재 패널이 몇번째 패널인지
    index: number;
    // 패널의 너비
    size: number;
}

const INITIAL_STATE: CarouselStateInterface = {
    from: 0,
    to: 0,
    index: 0,
    size: 0,
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
     * ```
        const drag$ = start$.pipe(
            switchMap(start => move$.pipe(takeUntil(end$))),
        );
     * ```
     * (흔한 unhappy case : 드래그 중 view$ 범위를 벗어나면 end$가 값 발생을 안하므로 move$가 종료되지 않음)
     *
     *
     * 다음으로, 캐러셀을 움직이려면 클릭한 시점부터 x 좌표로 얼만큼 드래그했는지 알아야 함.
     * 기준 좌표는 start$안의 이벤트로부터 pageX 속성을 통해 알아내고, move$로부터 마우스가 얼만큼 움직였는지 알아낸다.
     * 결국 drag$는 드래그한 x 거리를 emit 하는 옵저버블이 된다.
     */
    const drag$ = start$.pipe(
        switchMap(start => {
            return move$.pipe(
                map(move => move.pageX - start.pageX),
                takeUntil(end$),
                map<number, DragAndDropInterface>(distance => ({distance})), // drag$와 drop$의 데이터 형태 맞추기
            );
        }),
        tap((_: DragAndDropInterface) => {}), // HACK: 방출하는 값의 타입체크를 위함
        // tap(x => console.log("drag$", x)),
        share(), // drop$이 Cold Observable인 drag$에서 시작되므로, share 사용하지 않으면 drag$ 옵저버블이 중복 실행된다
    );
    // drag$.subscribe((drag) => console.log("dragDiffX", drag));

    /**
     * drop 옵저버블 만들기
     *
     * '드래그 후' 마우스를 뗄 때 발생하는 이벤트이므로 drag$를 이용해 만들어보자.
     *
     * ```
        const drop$ = drag$.pipe(
            mergeMap(drag => end$)
        );
     * ```
     * 만약 이렇게만 만든다면, 모든 드래그 이벤트가 end$ 옵저버블이 되고, 마우스를 뗄 때, 드래그 이벤트마다 end$가 값을 emit한다.
     *
     * end$ 방출 값은 단 하나만 필요하므로 take(1) 또는 first() 오퍼레이터를 사용한다.
     * (둘다 조건이 충족되면 옵저버블을 complete 한다.)
     *
     * 또한 switchMap을 적용한다.
     *
     * `switchAll`
     * 이 오퍼레이터가 구독하는 source 옵저버블은 '옵저버블로 된 옵저버블'(higher-order observable 이라고도 함)이다.
     * source가 emit하는 가장 최신 inner 옵저버블만을 구독하며 이전에 구독하던 inner 옵저버블은 구독을 해제한다.
     * source 옵저버블과, inner 옵저버블 둘 다 complete 되어야, 이 오퍼레이터가 리턴하는 옵저버블이 complete된다.
     *
     * -> 지금 만든 drop$은 size$ 데이터를 함께 emit할 수 있도록, size$ 하단으로 이동.
     */
    // const drop$ = drag$.pipe(
    //     switchMap(drag => end$.pipe(first()))
    // );
    // drop$.subscribe(drop => console.log("drop", drop));

    /**
     * 브라우저 사이즈가 변할 때 $view의 너비를 emit하는 옵저버블
     *
     * 첫 렌더시 "resize" 이벤트가 발생하지 않으므로, 초기값은 `startWith` 오퍼레이터를 통해 전달한다.
     */
    const size$ = fromEvent(window, "resize").pipe(
        startWith($view.clientWidth),
        map(size => $view.clientWidth),
    );
    // size$.subscribe((ev) => console.log("ev", ev));

    /**
     * drop$이 x축 드래그 변화량을 emit 하도록 map하고,
     * 동시에 size$를 통해 뷰의 너비를 emit 하도록 `withLatestFrom` 오퍼레이터를 사용한다.
     *
     * 이제 drop$의 값을 이용해 캐러셀을 다음 페이지로 넘길지, 현재 페이지를 유지할지 결정할 수 있다.
     */
    const drop$ = drag$.pipe(
        switchMap(dragDeltaX => end$.pipe(
                map(event => dragDeltaX),
                first()
            ),
        ),
        withLatestFrom(size$),
        map(([distance, size]) => ({...distance, size})), // drag$와 drop$의 데이터 형태 맞추기
        tap((_: DragAndDropInterface) => {}), // HACK: 방출하는 값의 타입체크를 위함
    );
    // drop$.subscribe(drop => console.log("drop", drop));

    const carousel$ = merge(drag$, drop$).pipe(
        scan<DragAndDropInterface, CarouselStateInterface>((store, {distance, size}) => {
            const updateStore: Partial<CarouselStateInterface> = {
                from: -(store.index * store.size) + distance,
            };

            if (size === undefined) {
                // drag 중 : 마우스 이동한 만큼 캐러셀도 이동
                updateStore.to = updateStore.from;
            } else {
                // drop : threshold보다 크게 움직였다면, 방향에 따라 인덱스를 증감 (최대최소를 넘지는 않게)
                const THRESHOLD = 30;
                let toBeIndex = store.index;
                if (Math.abs(distance) > THRESHOLD) {
                    toBeIndex = distance < 0 ?
                        Math.min(toBeIndex + 1, PANEL_COUNT - 1) :
                        Math.max(toBeIndex - 1, 0);
                }
                updateStore.index = toBeIndex;
                updateStore.to = -(toBeIndex * size);
                updateStore.size = size;
            }

            return { ...store, ...updateStore };
        }, INITIAL_STATE),
    );

    carousel$.subscribe(store => {
        console.log("state", store);
        $container.style.transform = `translateX(${store.to}px)`;
    });
};

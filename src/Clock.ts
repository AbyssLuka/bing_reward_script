export class Clock {
    private st = performance.now();
    getDelta() {
        const ct = performance.now();
        const delta = ct - this.st;
        this.st = ct;
        return delta;
    }
}
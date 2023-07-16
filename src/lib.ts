export type ResultOk<T> = { value: T };
export type ResultError<E> = { error: E };

export class Result<T, E> {
    constructor(public result:  ResultOk<T> | ResultError<E>) { }

    break_result(): T {
        if (this.is_ok()) {
            return this.result.value;
        } else if (this.is_error()) {
            throw this.result.error;
        } else {
            // Should not be possible to be here, result should be Ok or Error
            throw new Error("malformed result");
        }
    }

    is_ok(): this is { result: ResultOk<T> } {
        return "value" in this.result;
    }

    is_error(): this is { result: ResultError<E> } {
        return "error" in this.result;
    }

    static ok<T, E>(value: T): Result<T, E> {
        return new Result({ value });
    }

    static error<T, E>(error: E): Result<T, E> {
        return new Result({ error });
    }
}

export class AsyncResult<T, E> {
    /** Internal promise is always a Promise<Result<T, E>> */
    private promise: Promise<Result<T, E>>;

    /** Converts a regular promise to a `Result`-ified promise */
    constructor(p: Promise<AsyncResult<T, E> | Result<T, E> | T>) {
        this.promise = p
            .then((value) => {
                if (value instanceof AsyncResult) {
                    // Will resolve to Result<T, E>
                    return value.promise;
                } else if (value instanceof Result) {
                    return Promise.resolve(value);
                } else {
                    // Is Result<T, E>
                    return Promise.resolve(Result.ok<T, E>(value));
                }
            })
            .catch((error: E) => Result.error<T, E>(error));
    }

    /** Executes the supplied closure if the result is successful
     *  New value can be of any type, and can return any error type.
     */
    and_then<T2>(f: (value: T) => AsyncResult<T2, E>): AsyncResult<T2, E> {
        return new AsyncResult<T2, E>(
            this.promise.then((result: Result<T, E>): AsyncResult<T2, E> => {
                if (result.is_ok()) {
                    return f(result.result.value);
                } else if (result.is_error()) {
                    return AsyncResult.error(result.result.error);
                } else {
                    // Should not be possible to be here, AsyncResult should be Ok or Error
                    throw new Error("malformed async result");
                }
            })
        );
    }

    /** Executes the supplied closure if the result is unsuccessful
     *  Useful for providing a fallback value if an error occurs.
     */
    or_else(f: (error: E) => AsyncResult<T, E>): AsyncResult<T, E> {
        return new AsyncResult<T, E>(
            this.promise.then((result: Result<T, E>): AsyncResult<T, E> => {
                if (result.is_error()) {
                    // Pass the closure the error value
                    return f(result.result.error);
                } else if (result.is_ok()) {
                    // Pass the current instance of the AsyncResult onwards
                    return AsyncResult.ok(result.result.value);
                } else {
                    // Should not be possible to be here, AsyncResult should be Ok or Error
                    throw new Error("malformed async result");
                }
            })
        )
    }

    map_error<E2>(f: (error: E) => E2): AsyncResult<T, E2> {
        return new AsyncResult<T, E2>(
            this.promise.then((result: Result<T, E>): Result<T, E2> => {
                if (result.is_error()) {
                    return Result.error(f(result.result.error));
                } else if (result.is_ok()){
                    return Result.ok(result.result.value);
                } else {
                    // Should not be possible to be here, AsyncResult should be Ok or Error
                    throw new Error("malformed async result");
                }
            })
        );
    }

    /** Consumes the async result, exposing the underlying promise */
    to_promise(): typeof this.promise {
        return this.promise;
    }

    /** Create an AsyncResult that resolves to an `ok` variant */
    static ok<T, E>(value: T): AsyncResult<T, E> {
        return new AsyncResult(Promise.resolve(value));
    }

    /** Create an AsyncResult that resolves to an `error` variant */
    static error<T, E>(error: E): AsyncResult<T, E> {
        return new AsyncResult(Promise.reject(error));
    }
}


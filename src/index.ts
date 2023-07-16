import { AsyncResult } from "./lib";

function test_function(success: boolean): Promise<string> {
    if (success) {
        return Promise.resolve("h");
    } else {
        return Promise.reject(10);
    }
}

// Original error type must be specified here, so it can propagate through
let a = new AsyncResult<string, Error>(test_function(true))
    .and_then((value) => {
        console.log("The value is", value);
        return AsyncResult.ok([value, value].join(", "));
    })
    .and_then((s) => {
        return AsyncResult.ok(s.length);
    })
    .and_then((length) => {
        if (length >= 10) {
            return AsyncResult.ok("good length");
        } else {
            return AsyncResult.error(new Error("thing is too short"));
        }
    })
    .and_then((value) => {
        console.log("This shouldn't run");
        return AsyncResult.ok(value);
    })
    .or_else((e) => {
        console.log("Found error, providing default:", e.message);

        return AsyncResult.ok("default value");
    })
    .to_promise()
    .then((result) => {
        
        console.log(result)
    });


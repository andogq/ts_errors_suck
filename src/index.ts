import { ZodError, z } from "zod";
import { AsyncResult } from "./lib";

const User = z.object({
    username: z.string(),
    user_id: z.number(),
    admin: z.boolean(),
});
type User = z.infer<typeof User>;

async function login(username: string, password: string): Promise<{[key: string]: any}> {
    if (username === password) {
        return {
            username,
            user_id: username.length,
            admin: username === "admin",
        };
    } else {
        return {
            valid: false,
        }
    }
}

async function main() {
    // Generic required here, to enforce what the error type will be (would be awesome to get rid of the initial data type)
    new AsyncResult<{[key: string]: any}, ZodError<User>>(login("admin", "admin"))
        .and_then((response) => new AsyncResult(User.parseAsync(response)))
        .tap((user) => console.log(user))

        .tap_error((error) => {
            console.error("An error occurred whilst parsing data");
            console.error(error);
        })
        .map_error(() => {
            return "zod parse error";
        })

        // Return type required here, in order to help TS with the branch, since it can't infer types for shit
        .tap((user) => {
            console.log(`Successfully logged in ${user.username} (${user.user_id})`);
        })

        .filter((user) => user.admin, "user is not an admin")

        .map((user) => user.username)

        .and_then((admin_user) => {
            console.log(`Welcome to the admin zone, ${admin_user}`);
            return AsyncResult.ok(admin_user);
        })

        .or_else((error) => {
            console.log("User was not an admin");
            return AsyncResult.error(error);
        })
}

main();

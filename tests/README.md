# Tests

In the `project` folder we have a Noodl project that includes a few tests for Cloud Functions. To run the tests, you have to open the project and deploy it to your Cloud Service and frontend.

## Data

Here is a step by step guide on how to setup the data required to be able to run the tests.

1. Import the schema
2. Create a `Test` record where the `Text` column is `wagga` (required for "Simple Function node" test) 
3. Create 2 configs parameters:

If the Cloud Service is running on "localhost":

- name: `TestParameter`, type: `String`, value: `woff`, master key only: `false`
- name: `TestProtected`, type: `String`, value: `buff`, master key only: `true`

Otherwise:

- name: `TestParameter`, type: `String`, value: `wagga`, master key only: `false`
- name: `TestProtected`, type: `String`, value: `buff`, master key only: `true`

4. Create a `Test` record where the columns are (required for Test Record API):

```
ANumber: 15
ADate: 2022-11-07T10:23:52.301Z
AString: Test
ABoolean: true
AnObjetc: {"hej":"ho"}
AnArray: ["a", "b"]
Text: fetch-test
```

5. Import TestQuery data
6. Change the `Parent` pointer of "Lisa" to "Marge" (might have to empty the field before updating it)
7. Add "Lisa", "Bart" and "Maggie" as Children to "Homer"
8. Disable Class Level Protection (CLP) for Create on the User class. (required for Disable sign up)

9. Create a user with:

```
username: test
password: test
```

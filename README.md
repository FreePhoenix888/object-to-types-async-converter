# object-to-types-async-converter
[NPM](https://www.npmjs.com/package/@freephoenix888/object-to-types-async-converter)
# About
Creates types based on object value, also creates tree for them
For example:
You have created a type "Device" and inserted a link of type "Device" with object value
```
{
  name: 'MyName'
}
```
Convert link that will point to the link above will create type `Name` with from and to `Device` inside package which contains `Device` type
## How are handled different types of fields?
String,Number,Object values are converted links are loop-links (links that points to the same link by from and to)
Boolean values are converted to links which points to `Boolean` (`True` or `False`) from the `@freephoenix888/boolean` package
# How to use?
- Give permissions
```ts
const joinTypeLinkId = await deep.id("@deep-foundation/core", "Join");
const packageLinkId = await deep.id("@freephoenix888/object-to-types-async-converter");
await deep.insert([
  {
    type_id: joinTypeLinkId,
    from_id: packageLinkId,
    to_id: deep.linkId,
  },
])
```
- Install package
- Add type to your package and value link which tells that your type will have object value type
```ts
const containTypeLinkId = await deep.id("@deep-foundation/core", "Contain");
const valueTypeLinkId = await deep.id("@deep-foundation/core", "Value");
const typeTypeLinkId = await deep.id("@deep-foundation/core", "Type");

const typeName = ;
const containerLinkId = ;
const typeOfValue = 'object';

const typeOfValueInsertData = {
  type_id: valueTypeLinkId,
  to_id: await deep.id("@deep-foundation/core", typeOfValue.slice(0, 1).toUpperCase() + typeOfValue.slice(1)),
  in: {
    data: [
      {
        type_id: containTypeLinkId,
        from_id: containerLinkId,
        string: {
          data: {
            value: `TypeOfValueOf${typeName}`
          }
        }
      }
    ]
  }
}

await deep.serial({
  operations: [
    {
      table: 'links',
      type: 'insert',
      objects:
        [
          {
            type_id: typeTypeLinkId,
            from_id: await deep.id("@deep-foundation/core", "Any"),
            to_id: await deep.id("@deep-foundation/core", "Any"),
            in: {
              data: [
                {
                  type_id: containTypeLinkId,
                  from_id: containerLinkId,
                  string: {
                    data: {
                      value: typeName
                    }
                  }
                }
              ]
            },
            out: {
              data: [
                typeOfValueInsertData
              ]
            }
          }
        ]
    }
  ]
})
```
- Insert a link of your type with object value
- Insert a link of type Config
Note that config object value can contain property `addParentPropertyNameToChildName` which is of type boolean
- Insert a link of type `Convert` from link of type `Config` to a link with object value
```ts
const linkWithObjectLinkId = ;
await deep.serial({
  operations: [
    {
      table: 'links',
      type: 'insert',
      objects: [
        {
          from_id: deep.linkId,
          type_id: await deep.id("@freephoenix888/object-to-types-async-converter", "Convert"),
          to_id: linkWithObjectLinkId,
          in: {
            data: {
              type_id: await deep.id("@deep-foundation/core", "Contain"),
              from_id: deep.linkId
            }
          }
        }
      ]
    }
  ]
})
```
- Enable promises in deepcase settings to see result (Rejected or Resolved)
- Look at your package to see new types 
- Delete Convert links if you want
```ts
await deep.serial({
  operations: [
    {
      table: 'links',
      type: 'delete',
      exp: {
        up: {
          tree_id: { _eq: await deep.id("@deep-foundation/core", "containTree") },
          parent: {
            type_id: { _id: ["@deep-foundation/core", "Contain"] },
            to: {
              type_id: await deep.id("@freephoenix888/object-to-types-async-converter", "Convert")
            },
            from_id: deep.linkId,
          }
        }
      }
    }
  ]
})
```

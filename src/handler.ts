import {
  DeepClient,
  SerialOperation,
} from '@deep-foundation/deeplinks/imports/client';
import { BoolExpLink } from '@deep-foundation/deeplinks/imports/client_types';
import { Link } from '@deep-foundation/deeplinks/imports/minilinks';

async ({
  deep,
  data: { newLink: convertLink },
}: {
  deep: DeepClient;
  data: { newLink: Link<number> };
}) => {
  const util = await import('util');
  const logs: Array<any> = [];
  const DEFAULT_LOG_DEPTH = 3;
  try {
    const result = await main();
    return {
      result,
      logs,
    };
  } catch (error) {
    return {
      error,
      logs,
    };
  }

  async function main() {
    const log = await getNamespacedLogger({ namespace: main.name });
    const containTypeLinkId = await deep.id('@deep-foundation/core', 'Contain');
    log({ containTypeLinkId });
    const typeTypeLinkId = await deep.id('@deep-foundation/core', 'Type');
    log({ typeTypeLinkId });
    const valueTypeLinkId = await deep.id('@deep-foundation/core', 'Value');
    log({ valueTypeLinkId });
    const booleanTypeLinkId = await deep.id(
      '@freephoenix888/boolean',
      'Boolean'
    );
    log({ booleanTypeLinkId });
    const treeIncludeFromCurrentTypeLinkId = await deep.id(
      '@deep-foundation/core',
      'TreeIncludeFromCurrent'
    );
    log({ treeIncludeFromCurrentTypeLinkId });
    await updateMinilinks({ containTypeLinkId });

    const {
      data: [linkWithObjectValue],
    } = await deep.select({
      id: convertLink.to_id,
    });
    log({ linkWithObjectValue });
    if (!linkWithObjectValue.value?.value) {
      throw new Error(`Link ##${linkWithObjectValue.id} does not have value`);
    }
    if (Object.keys(linkWithObjectValue.value.value).length === 0) {
      throw new Error(`Object value of ##${linkWithObjectValue.id} is empty`);
    }
    const obj = linkWithObjectValue.value.value;
    log({ obj });

    const config = await getConfig({
      linkWithObjectValue,
    });
    log({ config });

    const linksToReserveCount = getLinksToReserveCount({ obj });
    log({ linksToReserveCount });
    const reservedLinkIds = await deep.reserve(
      linksToReserveCount *
        (1 + // Type
          1 + // Contain for type
          1 + // Value
          1 + // Contain for value
          1 + // TreeIncludeFromCurrent
          1) + // Contain for TreeIncludeFromCurrent
        (1 + // Tree
          1) // Contain for Tree
    );
    log({ reservedLinkIds });
    const containerLinkOfLinkWithObjectValue =
      await getContainerLinkOfLinkWithObjectValue({
        containTypeLinkId,
        linkWithObjectValue,
      });
    log({ containerLinkOfLinkWithObjectValue });
    const nameOfTypeOfLinkWithObjectValue =
      await getNameOfTypeOfLinkWithObjectValue({
        linkWithObjectValue,
        containTypeLinkId,
      });
    log({ nameOfTypeOfLinkWithObjectValue });
    const serialOperations = await getTypesForObjectSerialOperations({
      parentPropertyName: undefined,
      parentLinkId: linkWithObjectValue.type_id,
      reservedLinkIds,
      containerLinkId: containerLinkOfLinkWithObjectValue.id,
      obj: obj,
      nameOfTypeOfLinkWithObjectValue,
      booleanTypeLinkId,
      containTypeLinkId,
      treeIncludeFromCurrentTypeLinkId,
      typeTypeLinkId,
      valueTypeLinkId,
      config,
    });
    log({ serialOperations });

    const serialResult = await deep.serial({
      operations: serialOperations,
    });
    log({ serialResult });

    return serialResult;
  }

  async function updateMinilinks(options: { containTypeLinkId: number }) {
    const { containTypeLinkId } = options;
    const devicePackageSelectData: BoolExpLink = {
      type_id: {
        _id: ['@deep-foundation/core', 'Package'],
      },
      string: {
        value: '@deep-foundation/core',
      },
    };

    const containSelectData: BoolExpLink = {
      from: devicePackageSelectData,
      type_id: containTypeLinkId,
      string: {
        value: {
          _in: ['String', 'Number', 'Object'],
        },
      },
    };

    const { data: containLinks } = await deep.select(containSelectData, {
      returning: `
          ${deep.selectReturning}
          from {
            ${deep.selectReturning}
          }
          to {
           ${deep.selectReturning}
          }
          `,
    });
    deep.minilinks.apply(
      containLinks
        .map((containLink) => [containLink.from, containLink, containLink.to])
        .flat()
    );
  }

  async function getTypeInsertSerialOperations(options: {
    parentLinkId: number;
    typeLinkId: number;
    containerLinkId: number;
    typeName: string;
    typeOfValue: string;
    valueLinkId: number;
    valueContainLinkId: number;
    typeContainLinkId: number;
    treeIncludeFromCurrentLinkId: number;
    containForTreeIncludeFromCurrentLinkId: number;
    treeLinkId: number;
    typeTypeLinkId: number;
    containTypeLinkId: number;
    booleanTypeLinkId: number;
    treeIncludeFromCurrentTypeLinkId: number;
    valueTypeLinkId: number;
  }): Promise<Array<SerialOperation>> {
    const {
      parentLinkId,
      typeLinkId,
      containerLinkId,
      typeName,
      typeOfValue,
      valueLinkId,
      valueContainLinkId,
      typeContainLinkId,
      treeIncludeFromCurrentLinkId,
      containForTreeIncludeFromCurrentLinkId,
      treeLinkId,
      booleanTypeLinkId,
      containTypeLinkId,
      typeTypeLinkId,
      treeIncludeFromCurrentTypeLinkId,
      valueTypeLinkId,
    } = options;
    const log = await getNamespacedLogger({
      namespace: getTypeInsertSerialOperations.name,
    });
    const serialOperations: Array<SerialOperation> = [];
    const typeInsertSerialOperation: SerialOperation = {
      table: 'links',
      type: 'insert',
      objects: [
        {
          id: typeLinkId,
          type_id: typeTypeLinkId,
          from_id: parentLinkId,
          to_id: typeOfValue === 'boolean' ? booleanTypeLinkId : parentLinkId,
        },
      ],
    };
    serialOperations.push(typeInsertSerialOperation);
    let typeContainInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'links',
      objects: {
        id: typeContainLinkId,
        type_id: containTypeLinkId,
        from_id: containerLinkId,
        to_id: typeLinkId,
      },
    };
    serialOperations.push(typeContainInsertSerialOperation);
    let valueOftypeContainInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'strings',
      objects: {
        link_id: typeContainLinkId,
        value: typeName,
      },
    };
    serialOperations.push(valueOftypeContainInsertSerialOperation);
    const treeIncludeFromCurrentInsertSerialOperation: SerialOperation = {
      table: 'links',
      type: 'insert',
      objects: {
        id: treeIncludeFromCurrentLinkId,
        type_id: treeIncludeFromCurrentTypeLinkId,
        from_id: treeLinkId,
        to_id: typeLinkId,
      },
    };
    serialOperations.push(treeIncludeFromCurrentInsertSerialOperation);
    let containForTreeInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'links',
      objects: {
        id: containForTreeIncludeFromCurrentLinkId,
        type_id: containTypeLinkId,
        from_id: containerLinkId,
        to_id: treeIncludeFromCurrentLinkId,
      },
    };
    serialOperations.push(containForTreeInsertSerialOperation);
    let valueForContainForTreeInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'strings',
      objects: {
        link_id: containForTreeIncludeFromCurrentLinkId,
        value: `TreeIncludeFromCurrent${typeName}`,
      },
    };
    serialOperations.push(valueForContainForTreeInsertSerialOperation);
    if (typeOfValue !== 'undefined' && typeOfValue !== 'boolean') {
      let typeOfValueInsertSerialOperation: SerialOperation = {
        type: 'insert',
        table: 'links',
        objects: {
          id: valueLinkId,
          from_id: typeLinkId,
          type_id: valueTypeLinkId,
          to_id: await deep.id(
            '@deep-foundation/core',
            typeOfValue.slice(0, 1).toUpperCase() + typeOfValue.slice(1)
          ),
        },
      };
      serialOperations.push(typeOfValueInsertSerialOperation);
      let containToTypeOfValueInsertSerialOperation: SerialOperation = {
        type: 'insert',
        table: 'links',
        objects: {
          id: valueContainLinkId,
          type_id: containTypeLinkId,
          from_id: containerLinkId,
          to_id: valueLinkId,
        },
      };
      serialOperations.push(containToTypeOfValueInsertSerialOperation);
      let valueOfContainToTypeOfValueInsertSerialOperation: SerialOperation = {
        type: 'insert',
        table: 'strings',
        objects: {
          link_id: valueContainLinkId,
          value: `${typeName}Value`,
        },
      };
      serialOperations.push(valueOfContainToTypeOfValueInsertSerialOperation);
    }
    log({ serialOperations });
    return serialOperations;
  }

  async function getContainerLinkOfLinkWithObjectValue(options: {
    linkWithObjectValue: Link<number>;
    containTypeLinkId: number;
  }) {
    const { linkWithObjectValue, containTypeLinkId } = options;
    const log = await getNamespacedLogger({
      namespace: getContainerLinkOfLinkWithObjectValue.name,
    });
    log({ options });
    const containerLinkOfLinkWithObjectValueSelectData = {
      out: {
        type_id: containTypeLinkId,
        to_id: linkWithObjectValue.type_id,
      },
    };
    log({ containerLinkOfLinkWithObjectValueSelectData });
    const {
      data: [containerLinkOfLinkWithObjectValue],
    } = await deep.select(containerLinkOfLinkWithObjectValueSelectData);
    log({ containerLinkOfLinkWithObjectValue });
    if (!containerLinkOfLinkWithObjectValue) {
      throw new Error(
        `Unable to find link that contains ##${
          linkWithObjectValue.type_id
        } by using query ${JSON.stringify(
          containerLinkOfLinkWithObjectValueSelectData
        )}`
      );
    }
    return containerLinkOfLinkWithObjectValue;
  }

  async function getTypesForObjectSerialOperations(options: {
    parentPropertyName: string | undefined;
    parentLinkId: number;
    reservedLinkIds: Array<number>;
    containerLinkId: number;
    obj: Record<string, any>;
    nameOfTypeOfLinkWithObjectValue: string;
    containTypeLinkId: number;
    booleanTypeLinkId: number;
    treeIncludeFromCurrentTypeLinkId: number;
    typeTypeLinkId: number;
    valueTypeLinkId: number;
    config: Config;
  }): Promise<Array<SerialOperation>> {
    const {
      parentPropertyName,
      parentLinkId,
      reservedLinkIds,
      containerLinkId,
      obj,
      nameOfTypeOfLinkWithObjectValue,
      containTypeLinkId,
      booleanTypeLinkId,
      treeIncludeFromCurrentTypeLinkId,
      typeTypeLinkId,
      valueTypeLinkId,
      config,
    } = options;
    const log = await getNamespacedLogger({
      namespace: getTypesForObjectSerialOperations.name,
    });
    log({ options });
    let serialOperations: Array<SerialOperation> = [];
    const treeTypeLinkId = await deep.id('@deep-foundation/core', 'Tree');
    const treeLinkId = reservedLinkIds.pop()!;
    const containForTreeLinkId = reservedLinkIds.pop()!;
    const treeInsertSerialOperation: SerialOperation = {
      table: 'links',
      type: 'insert',
      objects: [
        {
          id: treeLinkId,
          type_id: treeTypeLinkId,
        },
      ],
    };
    serialOperations.push(treeInsertSerialOperation);
    let containForTreeInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'links',
      objects: {
        id: containForTreeLinkId,
        type_id: containTypeLinkId,
        from_id: containerLinkId,
        to_id: treeLinkId,
      },
    };
    serialOperations.push(containForTreeInsertSerialOperation);
    let valueForContainForTreeInsertSerialOperation: SerialOperation = {
      type: 'insert',
      table: 'strings',
      objects: {
        link_id: containForTreeLinkId,
        value: `${nameOfTypeOfLinkWithObjectValue}Tree`,
      },
    };
    serialOperations.push(valueForContainForTreeInsertSerialOperation);
    for (const [key, value] of Object.entries(obj)) {
      console.log({ key, value });
      const typeLinkId = reservedLinkIds.pop()!;
      if (value === undefined || value === null) continue;
      if (Array.isArray(value)) {
        const innerSerialOperations = await getArrayInsertSerialOperations({
          containerLinkId,
          key,
          parentLinkId,
          reservedLinkIds,
          value,
          treeLinkId,
          nameOfTypeOfLinkWithObjectValue: nameOfTypeOfLinkWithObjectValue,
          booleanTypeLinkId,
          containTypeLinkId,
          treeIncludeFromCurrentTypeLinkId,
          typeTypeLinkId,
          valueTypeLinkId,
          config
        });
        serialOperations = [...serialOperations, ...innerSerialOperations];
      } else if (typeof value === 'object') {
        const innerSerialOperations = await getTypesForObjectSerialOperations({
          parentPropertyName: key,
          parentLinkId,
          reservedLinkIds,
          containerLinkId,
          obj: value,
          nameOfTypeOfLinkWithObjectValue,
          containTypeLinkId,
          booleanTypeLinkId,
          treeIncludeFromCurrentTypeLinkId,
          typeTypeLinkId,
          valueTypeLinkId,
          config,
        });
        serialOperations = [...serialOperations, ...innerSerialOperations];
      } else {
        let typeName = key.slice(0, 1).toUpperCase() + key.slice(1);
        if (config.addParentPropertyNameToChildName) {
          if (parentPropertyName) {
            const parentPropertyNameFirstLetterUppered =
              parentPropertyName.slice(0, 1).toUpperCase() +
              parentPropertyName.slice(1);
            typeName = `${parentPropertyNameFirstLetterUppered}${typeName}`;
          }
        }
        const typeInsertSerialOperations = await getTypeInsertSerialOperations({
          parentLinkId,
          typeLinkId,
          containerLinkId,
          typeName,
          typeOfValue: typeof value,
          valueContainLinkId: reservedLinkIds.pop()!,
          valueLinkId: reservedLinkIds.pop()!,
          typeContainLinkId: reservedLinkIds.pop()!,
          treeIncludeFromCurrentLinkId: reservedLinkIds.pop()!,
          containForTreeIncludeFromCurrentLinkId: reservedLinkIds.pop()!,
          treeLinkId,
          containTypeLinkId,
          booleanTypeLinkId,
          treeIncludeFromCurrentTypeLinkId,
          typeTypeLinkId,
          valueTypeLinkId,
        });
        serialOperations = [...serialOperations, ...typeInsertSerialOperations];
      }
    }
    log({ serialOperations });
    return serialOperations;
  }

  function getLinksToReserveCount(options: { obj: Record<string, any> }) {
    const { obj } = options;
    let count = Object.keys(obj).length;
    for (const value of Object.values(obj)) {
      if (!value) continue;
      if (typeof value === 'object') {
        count += getLinksToReserveCount({ obj: value });
      } else if (Array.isArray(value) && value.length > 0) {
        count += getLinksToReserveCount({ obj: value[0] });
      }
    }
    return count;
  }

  interface Config {
    addParentPropertyNameToChildName: boolean;
  }

  async function getConfig(options: {
    linkWithObjectValue: Link<number>;
  }): Promise<Config> {
    const { linkWithObjectValue } = options;
    const customConfig = (await getConfigLink({ linkWithObjectValue })).value
      ?.value;
    return {
      addParentPropertyNameToChildName:
        customConfig?.addParentPropertyNameToChildName ?? false,
    };
  }

  async function getArrayInsertSerialOperations(options: {
    key: string;
    value: any;
    parentLinkId: number;
    containerLinkId: number;
    reservedLinkIds: Array<number>;
    treeLinkId: number;
    nameOfTypeOfLinkWithObjectValue: string;
    booleanTypeLinkId: number;
    containTypeLinkId: number;
    treeIncludeFromCurrentTypeLinkId: number;
    typeTypeLinkId: number;
    valueTypeLinkId: number;
    config: Config;
  }): Promise<Array<SerialOperation>> {
    const {
      key,
      value,
      parentLinkId,
      containerLinkId,
      reservedLinkIds,
      treeLinkId,
      nameOfTypeOfLinkWithObjectValue,
      booleanTypeLinkId,
      containTypeLinkId,
      treeIncludeFromCurrentTypeLinkId,
      typeTypeLinkId,
      valueTypeLinkId,
      config,
    } = options;
    const log = await getNamespacedLogger({
      namespace: getArrayInsertSerialOperations.name,
    });
    let typeNameWithoutS = key.at(-1) === 's' ? key.slice(0, -1) : key;
    typeNameWithoutS =
      typeNameWithoutS.slice(0, 1).toUpperCase() + typeNameWithoutS.slice(1);
    let typeOfArrayElement = typeof value[0];
    console.log({ typeOfArrayElement });
    let serialOperations = [];
    if (typeOfArrayElement === 'object') {
      serialOperations = await getTypesForObjectSerialOperations({
        parentPropertyName: typeNameWithoutS,
        parentLinkId,
        reservedLinkIds,
        containerLinkId,
        obj: value[0],
        nameOfTypeOfLinkWithObjectValue,
        booleanTypeLinkId,
        containTypeLinkId,
        treeIncludeFromCurrentTypeLinkId,
        typeTypeLinkId,
        valueTypeLinkId,
        config,
      });
    } else {
      serialOperations = await getTypeInsertSerialOperations({
        parentLinkId,
        typeLinkId: reservedLinkIds.pop()!,
        containerLinkId,
        valueContainLinkId: reservedLinkIds.pop()!,
        valueLinkId: reservedLinkIds.pop()!,
        typeOfValue: typeOfArrayElement,
        typeName: typeNameWithoutS,
        typeContainLinkId: reservedLinkIds.pop()!,
        treeIncludeFromCurrentLinkId: reservedLinkIds.pop()!,
        containForTreeIncludeFromCurrentLinkId: reservedLinkIds.pop()!,
        treeLinkId,
        booleanTypeLinkId,
        containTypeLinkId,
        treeIncludeFromCurrentTypeLinkId,
        typeTypeLinkId,
        valueTypeLinkId,
      });
    }
    log({ serialOperations });
    return serialOperations;
  }

  async function getConfigLink(options: { linkWithObjectValue: Link<number> }) {
    const { linkWithObjectValue } = options;
    const selectData = {
      id: convertLink.from_id,
    };
    const {
      data: [link],
    } = await deep.select(selectData);
    if (!link) {
      throw new Error(
        `Unable to find link that contains ##${
          linkWithObjectValue.type_id
        } by using query ${JSON.stringify(selectData)}`
      );
    }
    return link;
  }

  async function getNameOfTypeOfLinkWithObjectValue(options: {
    linkWithObjectValue: Link<number>;
    containTypeLinkId: number;
  }) {
    const { linkWithObjectValue, containTypeLinkId } = options;
    const selectData = {
      type_id: containTypeLinkId,
      to_id: linkWithObjectValue.type_id,
    };
    const {
      data: [containLink],
    } = await deep.select(selectData);
    if (!containLink) {
      throw new Error(
        `Select with data ${JSON.stringify(selectData)} returned no data`
      );
    }
    const name = containLink.value?.value;
    if (!name) {
      throw new Error(`${containLink.id} must have value`);
    }
    return name;
  }

  async function getNamespacedLogger({
    namespace,
    depth = DEFAULT_LOG_DEPTH,
  }: {
    namespace: string;
    depth?: number;
  }) {
    return function (content: any) {
      const message = util.inspect(content, { depth });
      logs.push(`${namespace}: ${message}`);
    };
  }
};

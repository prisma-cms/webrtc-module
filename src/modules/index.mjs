
import fs from "fs";

import chalk from "chalk";

import PrismaModule from "@prisma-cms/prisma-module";

import UserModule from "@prisma-cms/user-module";
import SocietyModule from "@prisma-cms/society-module";

// import CallModule from "./call";
import CallRequestModule from "./callRequest";

import MergeSchema from 'merge-graphql-schemas';

import path from 'path';

const moduleURL = new URL(import.meta.url);

const __dirname = path.dirname(moduleURL.pathname);

const { createWriteStream, unlinkSync } = fs;

const { fileLoader, mergeTypes } = MergeSchema



class Module extends PrismaModule {


  constructor(props = {}) {

    super(props);

    Object.assign(this, {
    });

    this.mergeModules([
      UserModule,
      SocietyModule,
      // CallModule,
      CallRequestModule,
    ]);

  }


  getSchema(types = []) {


    let schema = fileLoader(__dirname + '/schema/database/', {
      recursive: true,
    });


    if (schema) {
      types = types.concat(schema);
    }


    let typesArray = super.getSchema(types);

    return typesArray;

  }


  getApiSchema(types = []) {


    let baseSchema = [];

    let schemaFile = __dirname + "/../schema/generated/prisma.graphql";

    if (fs.existsSync(schemaFile)) {
      baseSchema = fs.readFileSync(schemaFile, "utf-8");

      baseSchema = this.cleanupApiSchema(baseSchema, [
        "ChatRoomCreateInput",
        "ChatRoomUpdateInput",
        "ChatMessageCreateInput",
        "ChatMessageUpdateInput",

        "ResourceCreateInput",
      ]);
      
    }
    
    let apiSchema = super.getApiSchema(types.concat(baseSchema), [
      // "ResourceCreateInput",
      "UserCreateOneInput",
      // "CallRequestCreateInput",
      "CallRequestUpdateDataInput",
      "ChatRoomCreateOneWithoutCallRequestsInput",
      "ChatRoomUpdateOneWithoutCallRequestsInput",
    ]);

    let schema = fileLoader(__dirname + '/schema/api/', {
      recursive: true,
    });

    apiSchema = mergeTypes([apiSchema.concat(schema)], { all: true });


    return apiSchema;

  }


  getResolvers() {

    const resolvers = super.getResolvers();


    Object.assign(resolvers.Query, this.Query);

    Object.assign(resolvers.Mutation, this.Mutation);

    Object.assign(resolvers.Subscription, this.Subscription);


    Object.assign(resolvers, {
    });

    return resolvers;
  }


}


export default Module;
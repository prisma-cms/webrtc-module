

import PrismaProcessor from "@prisma-cms/prisma-processor";
import PrismaModule from "@prisma-cms/prisma-module";
// import Auth from "@prisma-cms/prisma-auth";

import chalk from "chalk";
// import gql from "graphql-tag";

// import CallTransaction from "../callTransaction";

// const {
//   getUserId,
// } = Auth;

// const {
//   resolvers: {
//     Query: {
//       userCallBalance,
//     },
//   },
// } = CallTransaction;


class CallRequestProcessor extends PrismaProcessor {


  constructor(props) {

    super(props);

    this.objectType = "CallRequest";

  }

  async getUser(required = false, args) {

    if (args === undefined) {
      return super.getUser(required);
    }


    return this.ctx.db.query.user(args);

  }


  async create(objectType, args, info) {




    // console.log(chalk.green("createCallRequest ctx request", ctx.request));



    const {
      ctx,
    } = this;

    const {
      request,
      db,
    } = ctx


    this.setRequestTimeLimit(300);

    // return new Promise(() => {

    // });

    // return;

    let {
      data: {
        // callId,
        // calledId,
        Called,
        Caller,
        ...data
      },
      ...otherArgs
    } = args;


    if (!request) {
      throw (new Error("No request object"));
    }


    const currentUser = await this.getUser(true);

    const {
      id: currentUserId,
    } = currentUser;


    Caller = {
      connect: {
        id: currentUserId,
      },
    }

    // const {
    //   id: callerId,
    // } = Caller;


    /**
     * Получаем баланс пользователя по этому звонку
     */

    // const balance = await userCallBalance(null, {
    //   callId,
    // }, ctx);


    // const Call = await db.query.call({
    //   where: {
    //     id: callId,
    //   },
    // });


    // if (!Call) {
    //   return this.addError("Can not get call object");
    // }

    // const {
    //   min_time,
    //   minute_price,
    // } = Call;


    // if (minute_price && min_time && (minute_price * min_time > balance)) {

    //   return this.addError("Please, top-up call balance");
    // }

    // console.log("balance", balance);

    // return null;



    return new Promise(async (resolve, reject) => {



      data = {
        ...data,
        Caller,
        Called,
        status: "Created",
      }

      args.data = data;

      const {
        connect,
      } = Called || {}

      if (!connect) {
        throw new Error("Не указан целевой пользователь");
      }

      const called = await db.query.user({
        where: {
          ...connect,
        },
      });

      if (!called) {
        throw new Error("Не был получен целевой пользователь");
      }

      const {
        calledId,
      } = called;


      if (currentUserId === calledId) {
        return reject(new Error("Can not call yourself"));
      }

      // const Caller = await this.getUser(null, {
      //   id: callerId,
      // }, ctx)
      //   .catch(error => {
      //     reject(error);
      //   });

      if (!Caller) {
        return reject(new Error("Can not get Caller"));
      }

      // const Called = await this.getUser(null, {
      //   where: {
      //     id: calledId,
      //   },
      // })
      //   .catch(error => {
      //     reject(error);
      //   });

      // if (!Called) {
      //   return reject(new Error("Can not get Called"));
      // }

      let result;



      // Очищаем все аргументы
      info.fieldNodes.map(n => {
        n.arguments = []
      });


      let newObjectSchema = `
        {
          id
          status
          startedAt
          endedAt
          called_descriptions
          caller_descriptions
        }
      `

      let callRequest = await super.create(objectType, args, newObjectSchema)
        .catch(reject);


      console.log(chalk.green('create callRequest result'), callRequest);

      if (!callRequest) {
        return reject();
      }

      result = callRequest;

      const {
        id: callRequestId,
      } = callRequest;


      const list = async function () {


        const subscribeObject = await db.subscription.callRequest({
          where: {
            node: {
              id: callRequestId,
            }
          }
        }, ` {
          mutation
          node{
            id
            status
          } 
          previousValues{
            status
          }
        }`)
          .catch(error => {

            reject(error);
            throw (error)
          });


        console.log(chalk.green("callRequest subscribeObject"), subscribeObject);

        await subscribeObject.next().then((r) => {

          const {
            value,
            done,
          } = r;

          console.log(chalk.green("asyncIterator r"), r);
          console.log(chalk.green("asyncIterator value"), value);
          console.log(chalk.green("asyncIterator value.node"), value.node);
          console.log(chalk.green("asyncIterator done"), done);


          const {
            node: updatedCallRequest,
            previousValues,
          } = value && value.callRequest;

          if (updatedCallRequest) {

            const {
              status: prevStatus,
            } = previousValues || {};

            const {
              status,
            } = updatedCallRequest;
            // } = value || {};

            console.log(chalk.green("asyncIterator updatedCallRequest"), updatedCallRequest);
            console.log(chalk.green("asyncIterator previousValues"), previousValues);

            /**
             * Обновляем текущий объект
             */
            Object.assign(callRequest, updatedCallRequest);

            /**
             * В зависимости от статуса, прерываем отслеживание или продолжаем
             */

            if (prevStatus && status && prevStatus !== status) {


              if (prevStatus === "Started") {

                setTimeout(() => {

                  db.mutation.updateCallRequest({
                    where: {
                      id: callRequest.id,
                    },
                    data: {
                      status: "Ended",
                      endedAt: new Date(),
                    },
                  })
                    .catch(console.error);

                }, 200)

              }
              else {

                switch (status) {

                  case "Accepted":

                    /**
                     * Ставим небольшую задержку, так как возникают ситуации,
                     * что отправялеются не статусы "Accepted, Started", а дважды "Started, Started"
                     */

                    setTimeout(() => {

                      db.mutation.updateCallRequest({
                        where: {
                          id: callRequest.id,
                        },
                        data: {
                          status: "Started",
                          startedAt: new Date(),
                        },
                      })
                        .catch(console.error);

                    }, 200);

                    break;


                  case "Started":


                    break;


                  case "Rejected":
                  case "Canceled":
                  case "Missed":
                  case "Error":

                  // ???
                  case "Ended":
                    resolve(result);

                    return;
                    break;

                }

              }

            }


          }

          // return value ? value.room : null;
          list();
        });
      }

      list();

      // Выставляем счетчик на пропущенный звонок

      setTimeout(() => {
        // Если звонок не был принят, то отмечаем его как пропущенный

        console.log(chalk.green('callRequest.status === "Created"'), callRequest.status);
        console.log(chalk.green('callRequest.status === "Created" callRequest'), callRequest);

        // if (callRequest.status === "Created") {
        //   db.mutation.updateCallRequest({
        //     where: {
        //       id: callRequest.id,
        //     },
        //     data: {
        //       status: "Missed",
        //     },
        //   })
        //     .catch(console.error);
        // }
      }, 1000 * 60 * 5);


      // setTimeout(() => {
      //   db.mutation.updateCallRequest({
      //     where: {
      //       id: callRequest.id,
      //     },
      //     data: {
      //       status: "Missed",
      //     },
      //   })
      //     .catch(console.error);
      //   // }, 1000 * 60 * 0.5);
      // }, 1000 * 7);

      // setTimeout(() => {
      //   db.mutation.updateCallRequest({
      //     where: {
      //       id: callRequest.id,
      //     },
      //     data: {
      //       status: "Missed",
      //     },
      //   })
      //     .catch(console.error);
      //   // }, 1000 * 60 * 0.5);
      // }, 1000 * 10);



      /**
       * Если соединение прерывается, заворачиваем
       */


      request.on("close", () => {
        console.log(chalk.red("CallRequest On close connection"));

        if (callRequest) {

          const {
            id,
            status,
          } = callRequest;

          let newStatus;

          switch (status) {


            case "Created":

              newStatus = "Canceled"

              break;

            case "Answer":
            case "Started":

              newStatus = "Ended"

              break;

            case "Missed":
            case "Ended":
            case "Error":
            case "Canceled":

              break;

            default:

              newStatus = "Error"


          }

          db.mutation.updateCallRequest({
            where: {
              id: callRequest.id,
            },
            data: {
              status: newStatus,
            },
          })
            .catch(console.error);

        }

      });



    });


  }


  async createSelectCondition(args, info) {


    const currentUser = await this.getUser(true);

    console.log(chalk.green("createSelectCondition currentUser"), currentUser);

    const {
      id: currentUserId,
      // sudo,
    } = currentUser;


    let {
      where = {},
      ...other
    } = args;


    where = {
      ...where,
      OR: [{
        Called: {
          id: currentUserId,
        }
      }, {
        Caller: {
          id: currentUserId
        }
      }]
    }


    // Очищаем все аргументы
    info.fieldNodes.map(n => {
      n.arguments = []
    });

    return {
      ...other,
      where,
    };

  }


  async callRequests(args, info) {

    const {
      db,
    } = this.ctx;


    args = await this.createSelectCondition(args, info);

    return db.query.callRequests(args, info);
  }

  async callRequestsConnection(args, info) {

    const {
      db,
    } = this.ctx;


    args = await this.createSelectCondition(args, info);

    return db.query.callRequestsConnection(args, info);
  }

}


const createCallRequest = (source, args, ctx, info) => {

  return new CallRequestProcessor(ctx).create("CallRequest", args, info);
}


const createCallRequestProcessor = (source, args, ctx, info) => {

  return new CallRequestProcessor(ctx).createWithResponse("CallRequest", args, info);
}



const callRequestSub = {
  subscribe: async (parent, args, ctx, info) => {

    // console.log("callRequest ctx", ctx);


    // for (var i in ctx) {

    //   console.log("callRequest ctx i", i);
    // }


    // console.log("callRequest ctx connection", ctx.connection);

    const {
      currentUser,
    } = ctx;

    const {
      id: currentUserId,
    } = currentUser || {};

    // console.log("currentUserId", currentUserId);

    // if (!currentUserId) {
    //   throw new Error("Необходимо авторизоваться");
    // }

    let OR = [];

    if (!currentUserId) {
      // throw new Error("Необходимо авторизоваться");
      // return "Необходимо авторизоваться";
      // OR = [
      //   {
      //     User: {
      //       id: "null",
      //     },
      //   },
      // ];
      OR = [{
        Called: {
          id: "null",
        }
      }, {
        Caller: {
          id: "null",
        }
      }];
    }
    else {
      OR = [{
        Called: {
          id: currentUserId,
        }
      }, {
        Caller: {
          id: currentUserId,
        }
      }];
    }

    // return ;

    let {
      where,
      ...other
    } = args;


    // let {
    //   node,
    // } = where || {};

    // where = {
    //   ...where,
    //   node: {
    //     ...node,
    //     OR: [{
    //       Called: {
    //         id: userId,
    //       }
    //     }, {
    //       Caller: {
    //         id: userId,
    //       }
    //     }]
    //   },
    // }

    where = {
      AND: [
        {
          ...where,
        },
        {
          node: {
            OR,
          },
        },
      ],
    }

    // console.log(chalk.green("callRequestSub userId"), userId);
    // console.log(chalk.green("callRequestSub where"), where);

    // Очищаем все аргументы
    // info.fieldNodes.map(n => {
    //   n.arguments = []
    // });


    return ctx.db.subscription.callRequest({
      where,
      ...other
    }, info)
    // .then(r => {
    //   // console.log("callRequest subs result", r);
    //   return r;
    // })
    // .catch(e => {
    //   console.log(e);
    //   throw (e)
    // });

    // const sub = ctx.db.subscription['call']({}, info);
    // const sub = ctx.db.subscription.call({}, info);

    // console.log("call sub", sub);

    // return sub;
  },
};


const updateCallRequest = (source, args, ctx, info) => {

  return ctx.db.mutation.updateCallRequest({}, info);
}


const callRequests = (source, args, ctx, info) => {

  // return ctx.db.query.callRequestsConnection({}, info);

  return (new CallRequestProcessor(ctx)).callRequests(args, info);
}


const callRequestsConnection = (source, args, ctx, info) => {

  // return ctx.db.query.callRequestsConnection({}, info);

  return (new CallRequestProcessor(ctx)).callRequestsConnection(args, info);
}


const CallRequestResponse = {
  data: (source, args, ctx, info) => {

    const {
      id,
    } = source && source.data || {};

    return id ? ctx.db.query.callRequest({
      where: {
        id,
      },
    }, info) : null;

  },
}


// export default {
//   resolvers: {
//     Query: {
//       callRequests,
//       callRequestsConnection,
//     },
//     Mutation: {
//       createCallRequestProcessor,
//       createCallRequest,
//       updateCallRequest,
//     },
//     Subscription: {
//       callRequest: callRequestSub,
//     },
//     CallRequestResponse,
//   },
// }



class Module extends PrismaModule {


  // constructor(props = {}) {

  //   super(props);

  //   this.mergeModules([ 
  //   ]);

  // }



  getResolvers() {

    // const resolvers = super.getResolvers();


    // Object.assign(resolvers.Query, {
    //   resource: this.resource,
    //   resources: this.resources,
    //   resourcesConnection: this.resourcesConnection,
    // });


    // Object.assign(resolvers.Mutation, {
    //   createResourceProcessor: this.createResourceProcessor.bind(this),
    // });

    // // Object.assign(resolvers.Subscription, this.Subscription);


    // Object.assign(resolvers, {
    //   ResourceResponse: this.ResourceResponse(),
    // });

    // return resolvers;

    return {
      Query: {
        callRequests,
        callRequestsConnection,
      },
      Mutation: {
        createCallRequestProcessor,
        createCallRequest,
        updateCallRequest,
      },
      Subscription: {
        callRequest: callRequestSub,
      },
      CallRequestResponse,
    }

  }


  resources(source, args, ctx, info) {
    return ctx.db.query.resources({}, info);
  }

  resource(source, args, ctx, info) {
    return ctx.db.query.resource({}, info);
  }

  resourcesConnection(source, args, ctx, info) {
    return ctx.db.query.resourcesConnection({}, info);
  }


  getProcessor(ctx) {
    return new (this.getProcessorClass())(ctx);
  }

  getProcessorClass() {
    return CallRequestProcessor;
  }

  createResourceProcessor(source, args, ctx, info) {

    return this.getProcessor(ctx).createWithResponse("Resource", args, info);
  }

  ResourceResponse() {

    return {
      data: (source, args, ctx, info) => {

        const {
          id,
        } = source.data || {};

        return id ? ctx.db.query.resource({
          where: {
            id,
          },
        }, info) : null;
      }
    }
  }

}


export default Module;

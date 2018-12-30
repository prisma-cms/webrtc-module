
import chalk from "chalk";

import Processor from "@prisma-cms/prisma-processor";
import PrismaModule from "@prisma-cms/prisma-module";


// import PrismaGeth from "../prisma-geth";


class CallResponse extends Processor {



  constructor(props) {

    super(props);

    this.objectType = "Call";

  }


  async create(objectType, args, info) {


    console.log(chalk.green("create call args"), args);


    const {
      ctx,
    } = this;

    /**
     * Если указан roomId (ID комнаты), то смотрим по ней, и чтобы отправитель был в этой комнате,
     * а кому он шлет - это уже его дело. Если комната не указана, создаем новую
     * Если указан to (ID пользователя), то смотрим по нему.
     */

    let {
      to,
      data: argsData,
    } = args;


    let {
      Room,
      ...callData
    } = argsData || {};


    const {
      db,
      local,
    } = ctx;
    // let userId;

    // Получаем текущего пользователя
    const currentUser = await this.getUser(true);

    // if (!currentUser) {

    //   throw (new Error("Please, log in"));
    // }

    const {
      id: userId,
    } = currentUser;



    // const balance = await this.checkUserBalance(to)
    //   .catch(error => {
    //     console.error(chalk.red("Error"), error);
    //     throw error;
    //   });


    // if (!balance) {
    //   throw (new Error("Can not calculate call"));
    // }


    // const {
    //   tokens,
    //   timeLimit,
    //   callPrice: hour_price,
    //   minutePrice: minute_price,
    // } = balance;

    // if (!tokens) {
    //   throw (new Error("Please, top-up balance"));
    // }

    // if (timeLimit === 0) {
    //   throw (new Error("Please, top-up balance"));
    // }


    // If all OK, create new call

    let Members = {
      connect: [{
        id: userId,
      }, {
        id: to,
      }],
    }

    callData = Object.assign({ ...callData }, {
      CreatedBy: {
        connect: {
          id: userId,
        },
      },
      User: {
        connect: {
          id: to,
        },
      },
      status: "Requested",
      // hour_price,
      // minute_price,
    });


    /**
     * Если не указан ID чат-комнаты, то создаем новую
     */

    const {
      id: chatRoomId,
    } = Room || {};

    if (chatRoomId) {

      Room = {
        connect: {
          id: chatRoomId,
        },
      }

    } else {

      let name = (await db.query.users({
        where: {
          id_in: [userId, to],
        },
      })).map(({
        username,
        firstname,
        lastname,
        fullname,
      }) => fullname || [firstname, lastname].filter(n => n).join(" ") || username).join(", ");

      Room = {
        create: {
          name,
          Members,
          CreatedBy: {
            connect: {
              id: userId,
            },
          },
        },
      }

    }

    callData.Room = Room;


    console.log(chalk.green("create call callData"), callData);


    // return {}

    // await this.mutate("createCall", {
    const result = super.create(objectType, {
      data: callData,
    })
      .then(async r => {

        console.log(chalk.green("Create call result"), r);

        const data = r;

        // if (data) {

        //   const {
        //     id: callId,
        //   } = data;

        //   // Create notification
        //   db.mutation.createNotification({
        //     data: {
        //       type: "Call",
        //       objectId: callId,
        //       User: {
        //         connect: {
        //           id: to,
        //         }
        //       },
        //       data: {
        //       },
        //       createdby: userId,
        //     },
        //   })
        //     .catch(console.error);

        //   // console.log("notification", notification);
        // }


        return r;
      })
      .catch(e => {
        throw (e);
      });


    return result;
  }

  async update(objectType, args, info) {


    const {
      ctx,
    } = this;


    let {
      data: {
        contract: _contract,
        ...callData
      },
      where,
    } = args;


    const {
      db,
    } = ctx;


    const {
      status,
    } = callData;



    const currentUser = await this.getUser();


    if (!currentUser) {

      throw (new Error("Please, log in"));
    }


    const {
      userId,
    } = currentUser;

    // Получаем объект звонка
    const Call = await db.query.call({
      where,
    });

    if (!Call) {
      throw (new Error("Can not get call object"));
    }


    const {
      contract,
    } = Call;

    // success = false;
    // message = "DSfsdf";

    switch (status) {

      /**
       * Прежде чем принимать звонок, надо создать для него контракт
       */
      case "Accepted":

        break;

    }



    let result;

    if (!this.hasErrors()) {

      result = await super.update(objectType, {
        data: callData,
        where,
      })
        // .then(r => {

        //   console.log("call", r);

        //   data = r;

        // })
        .catch(e => {
          throw (e);
        });

    }





    console.log(chalk.green("updateCallRequest args"), args);


    console.log(chalk.green("updateCallRequest result"), result);

    // if (result) {

    //   const {
    //     id: callId,
    //   } = result;


    //   switch (status) {

    //     case "Accepted":

    //       createMembersNotifications(null, {
    //         id: callId,
    //         userId,
    //         exclude: [userId],
    //         data: {
    //           status,
    //         },
    //       }, ctx);

    //       break;

    //   }

    // }


    return result;

  }


  async checkUserBalance(to) {

    const {
      ctx,
    } = this;

    const {
      db,
      ether,
    } = ctx;


    const {
      web3,
    } = ether;

    // Получаем текущего пользователя

    const user = await this.getUser();

    const {
      id: userId,
    } = user || {};


    if (userId && to === userId) {
      throw (new Error("Can not call yourself"));
    }

    const currentUser = userId && (
      // await local.query.user({
      await db.query.user({
        where: {
          id: userId,
        },
      }).then(r => r)
        .catch(e => {
          console.error("Error", e);
          throw (e);
        })
    ) || null;

    // const currentUser = user;

    if (!currentUser) {
      // success = false;
      // message = "Can not get current user";
      throw (new Error("Can not get current user"));
    }



    // Получаем абонента
    // const recipient = await local.query.user({
    const recipient = await db.query.user({
      where: {
        id: to,
      },
    }).then(r => r)
      .catch(e => {
        throw (e);
      });



    if (!recipient) {
      // success = false;
      // message = "Can not get current user";
      throw (new Error("Can not get recipient"));
    }


    const {
      callPrice,
      callsEnabled,
    } = recipient;


    if (!callsEnabled) {
      throw (new Error("Recipient did not allow calls"));
    }




    const {
      // tokens,
      etherwallet,
    } = currentUser;


    const tokens = await ether.balanceOf(null, {
      address: etherwallet,
    }, ctx)
      .catch(console.error);


    let timeLimit;


    let minutePrice;
    let minutePriceInTokens;

    if (callPrice) {

      // Minute tax in EUR
      minutePrice = ((callPrice / 60))

      // Minute tax in Tokens
      minutePriceInTokens = (minutePrice / 700).toFixed(15);

      minutePriceInTokens = web3.utils.toWei(minutePriceInTokens);

      timeLimit = tokens ? Math.round(tokens / minutePriceInTokens) : 0;
    }


    const result = {
      tokens,
      callPrice,
      timeLimit,
      minutePrice,
      minutePriceInTokens,
    };


    return result;

  }

}


const callsConnection = function (source, args, ctx, info) {

  const {
    db,
  } = ctx;

  return db.query.callsConnection(args, info);
}


const createCallProcessor = async function (source, args, ctx, info) {

  return await new CallResponse(ctx).createWithResponse("Call", args, info)
    .catch(error => {
      console.error(chalk.red("Create call error"), error);
      throw error;
    });
}


const updateCallProcessor = async function (source, args, ctx, info) {

  return new CallResponse(ctx).updateWithResponse("Call", args, info);
}


/**
 * If call does not accepted in some time, request marked as missed
 * Create call request
 * Checking:
 * 1. Requested call exists
 * 2. Caller is call's creator
 * 3. Called is member of requested call
 */
// const createCallRequest = async function (source, args, ctx, info) {

//   let message = "";
//   let errors = [];
//   let data;
//   let success;



//   let {
//     data: {
//       ...callRequestData
//     },
//   } = args;


//   const {
//     db,
//     local,
//   } = ctx;


//   let Called;
//   let Call;

//   let userId;

//   // Получаем текущего пользователя
//   try {
//     userId = await getUserId(ctx);
//   }
//   catch (e) {
//     // success = false;
//     // message = "Please, log in";

//     throw (new Error("Please, log in"));
//   }


//   const {
//     called,
//     call,
//   } = callRequestData;


//   const {
//     connect: colledQuery,
//   } = called || {};


//   if (!colledQuery) {
//     success = false;
//     message = "Can not get Called query";
//   }
//   else {

//     Called = await db.query.user({
//       where: colledQuery,
//     })
//       .catch(error => {
//         throw (error);
//       });


//     console.log("Called", Called);

//     if (!Called) {
//       success = false;
//       message = "Can not get Called user";
//     }
//     else if (Called.id === userId) {
//       success = false;
//       message = "Can not call yourself";
//     }

//   }


//   if (success === undefined && !errors.length) {

//     const {
//       connect: callQuery,
//     } = call || {};


//     if (!callQuery) {
//       success = false;
//       message = "Can not get Call query";
//     }
//     else {



//       Call = await db.request(CallQuery, {
//         where: callQuery,
//       })
//         .catch(error => {
//           throw (error);
//         });


//       console.log("Call", Call);

//       if (!Call) {
//         success = false;
//         message = "Can not get Call object";
//       }
//       else {

//         const {
//           created_by,
//           Members,
//         } = Call;

//         if (created_by !== userId) {
//           success = false;
//           message = "Can not request foreign Call";
//         }
//         else {

//           // Check called Membership
//           if (!Members || !Members.find(({ id }) => id === Called.id)) {

//             success = false;
//             message = "Called does not member of requested call";

//           }

//         }

//       }

//     }

//   }


//   if (success === undefined && !errors.length) {


//     callRequestData = {
//       ...callRequestData,
//       status: "Created",
//       caller: {
//         connect: {
//           id: userId,
//         },
//       },
//     }

//     console.log("callRequestData", callRequestData);

//     await db.mutation.createCallRequest({
//       data: callRequestData,
//     })
//       .then(r => {

//         console.log("callRequest", r);

//         data = r;

//       })
//       .catch(e => {
//         console.error(e);
//         throw (e);
//       });


//   }




//   if (success === undefined && !errors.length) {

//     await new Promise(async (resolve, reject) => {


//       if (data) {

//         const {
//           id: callRequestId,
//         } = data;

//         const subscribeObject = await db.subscription.callRequest({
//           where: {
//             node: {
//               id: callRequestId,
//             }
//           }
//         })
//           .catch(error => {

//             reject(error);
//             throw (error)
//           });


//         const {
//           // return: subscribeResolve,
//           // throw: subscribeReject,
//           next,
//         } = subscribeObject;


//         let handler;

//         setTimeout(async () => {

//           if (handler === undefined) {

//             const result = await db.mutation.updateCallRequest({
//               where: {
//                 id: callRequestId,
//               },
//               data: {
//                 status: "Missed",
//               },
//             })
//               .then(r => {

//                 db.mutation.createNotification({
//                   data: {
//                     type: "CallRequest",
//                     objectId: callRequestId,
//                     user: {
//                       connect: {
//                         id: Called.id,
//                       }
//                     },
//                     data: {
//                       status: "Missed",
//                       callId: Call.id,
//                     },
//                     createdby: userId,
//                   },
//                 })
//                   .then(r => {

//                   })
//                   .catch(reject);

//               })
//               .catch(reject);

//           }

//           // console.log("subscribeResult handler 2", handler);

//         }, 30000);

//         handler = await next()
//           .then(r => {


//             resolve(r);

//             return r;
//           })
//           .catch(error => {

//             reject(error);

//             return null;
//           });

//       }


//       // // setTimeout(subscribeReject, 3000);
//       // setTimeout(() => subscribeResolve({
//       //   id: "test"
//       // }), 2000);


//     })
//       .catch(error => {
//         throw (error)
//       });
//   }

//   return {
//     success: success === undefined && !errors.length && data ? true : false,
//     message,
//     errors,
//     data,
//   };

// }



const CallResponseData = function ({ data }, args, ctx, info) {

  if (!data) {
    return null;
  }

  const {
    id,
  } = data;

  return ctx.db.query.call({
    where: {
      id,
    },
  }, info);

}



const call = function (source, args, ctx, info) {

  return ctx.db.query.call({
  }, info);

}


const callSubscription = {
  subscribe: async (parent, args, ctx, info) => {

    console.log("callSubscription");

    // return "Sdfdsf";

    return ctx.db.subscription.call(args, info)
  },
};




/**
 * Подключение к видеокомнате (контракт)
 */

const CallJoinRoom = async (source, args, ctx, info) => {


  const {
    callId,
  } = args;

  const {
    db,
    // web3,
  } = ctx;

  let payload = new CallContractProcessor(ctx);

  const Call = await payload.getCall(callId);


  if (!payload.hasErrors()) {

    // Получаем etherwallet пользователя
    const {
      etherwallet,
    } = await payload.getUser();

    if (!etherwallet) {
      payload.addError("Ethereum account required");
    }

  }

  let callprice = 0;
  let userBalance = 0;

  if (!payload.hasErrors()) {

    // Смотрим какая минимальная сумма входа и есть ли у пользователя на это финансы
    // callprice = await payload.getCallPrice(contract);

    // console.log("callprice", callprice);

  }

  if (!payload.hasErrors()) {

    // Получаем баланс пользователя
    // userBalance = await payload.getUserBalance(contract);

    // console.log("userBalance", userBalance);

  }

  // Если звонок стоит денег и не хватает баланса, надо выделить квоты и подключить в комнату.
  // При подключении депозит автоматически будет переведен
  if (callprice && userBalance < callprice) {


    payload.increaseApproval(contract, callprice)
      .then(async increaseApproval => {

        console.log("increaseApproval", increaseApproval);

        // После этого пытаемся подключиться к комнате
        if (increaseApproval) {
          let time = 0;
          const joinRoomResult = await payload.joinRoom(contract, time);
          console.log("joinRoom", joinRoomResult);

          const {
            status,
          } = joinRoomResult || {};

          if (status === "0x1") {

            // Если все ОК, надо подключиться к звонку
            payload.data = joinRoomResult;
          }
          else {
            payload.addError("Can not join call room");
          }

        }
      })
      .catch(error => {
        console.error(error);
      });

  }

  // Если никаких ошибок нет, то возвращаем ОК
  if (payload.success === undefined && !payload.hasErrors()) {
    payload.success = true;
    payload.data = true;
  }

  return payload.prepareResponse();

}


/**
 * Подключение к звонку
 */

const JoinCall = async (source, args, ctx, info) => {


  const {
    callId,
  } = args;

  const {
    db,
    // web3,
  } = ctx;

  let payload = new CallContractProcessor(ctx);

  const Call = await payload.getCall(callId);


  if (!payload.hasErrors()) {

  }


  // Если никаких ошибок нет, то возвращаем ОК

  if (payload.success === undefined && !payload.hasErrors()) {
    payload.success = true;
    payload.data = true;
  }

  return payload.prepareResponse();

}


const EndCall = async (source, args, ctx, info) => {


  const {
    callId,
  } = args;

  const {
    db,
    // web3,
  } = ctx;

  let payload = new CallContractProcessor(ctx);

  const Call = await payload.getCall(callId);


  if (!payload.hasErrors()) {


  }

  // Если никаких ошибок нет, то возвращаем ОК

  if (payload.success === undefined && !payload.hasErrors()) {

    payload.success = true;
    payload.data = true;
  }

  return payload.prepareResponse();

}




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
        callsConnection,
        call,
      },
      Mutation: {
        createCallProcessor,
        updateCallProcessor,

        // Подключение к комнате. 
        // CallJoinRoom,
        // JoinCall,
        // EndCall,
      },
      Subscription: {
        call: callSubscription,
      },
      CallResponse: {
        data: CallResponseData,
      },
      // Call: {
      //   CreatedBy: CallCreatedBy,
      // },
      // CallRequestProcessor: {
      //   data: CallRequestProcessorData,
      // },
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


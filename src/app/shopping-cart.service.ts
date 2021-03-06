import { Injectable } from "@angular/core";
import { AngularFireDatabase } from "@angular/fire/database";
import { Product } from "./models/product";
import { take } from "rxjs/operators";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ShoppingCart } from "./models/shopping-cart";

@Injectable({
  providedIn: "root",
})
export class ShoppingCartService {
  constructor(private db: AngularFireDatabase) {}

  private create() {
    return this.db.list("/shopping-carts").push({
      dateCreated: new Date().getTime(),
    });
  }

  async getCart(): Promise<Observable<ShoppingCart>> {
    let cartId = await this.getOrCreateCartId();
    return this.db
      .object("/shopping-carts/" + cartId)
      .valueChanges()
      .pipe(map((x: any) => new ShoppingCart(x.items)));
  }

  private async getOrCreateCartId() {
    let cartId = localStorage.getItem("cartId");
    if (cartId) return cartId;

    let result = await this.create();
    localStorage.setItem("cartId", result.key);
    return result.key;
  }

  async addToCart(product: Product) {
    let cartId = await this.getOrCreateCartId();
    let item$ = this.db.object(
      "/shopping-carts/" + cartId + "/items/" + product.key
    );
    item$
      .valueChanges()
      .pipe(take(1))
      .subscribe((item: any) => {
        if (item) item$.update({ quantity: item.quantity + 1 });
        else item$.set({ product: product, quantity: 1 });
      });
  }

  async removeFromCart(product: Product) {
    let cartId = await this.getOrCreateCartId();
    let item$ = this.db.object(
      "/shopping-carts/" + cartId + "/items/" + product.key
    );
    item$
      .valueChanges()
      .pipe(take(1))
      .subscribe((item: any) => {
        if (item) {
          let quantity = item.quantity - 1;
          if (quantity === 0) {
            item$.remove();
            this.getCart().then((data) =>
              data.pipe(take(1)).subscribe((cart) => {
                if (cart.totalItemsCount === 0) {
                  this.db
                    .object("/shopping-carts/" + cartId + "/items/")
                    .set(0);
                }
              })
            );
          } else item$.update({ quantity: quantity });
        }
      });
  }

  async clearCart() {
    let cartId = await this.getOrCreateCartId();
    this.db.object("/shopping-carts/" + cartId + "/items").remove();
    this.db.object("/shopping-carts/" + cartId + "/items/").set(0);
  }
}
